import cssnano from 'cssnano';
import pLimit from 'p-limit';
import RequestShortener from 'webpack/lib/RequestShortener';
import { ModuleFilenameHelpers } from 'webpack';
import { SourceMapSource, RawSource } from 'webpack-sources';
import { SourceMapConsumer } from 'source-map';
import validateOptions from 'schema-utils';

import schema from './options.json';

const warningRegex = /\[.+:([0-9]+),([0-9]+)\]/;

class CssnanoPlugin {
  constructor(options = {}) {
    validateOptions(schema, options, {
      name: 'Cssnano webpack plugin',
      baseDataPath: 'options',
    });

    this.options = Object.assign(
      {
        test: /\.css(\?.*)?$/i,
        sourceMap: false,
        cssnanoOptions: {
          preset: 'default',
        },
      },
      options
    );

    if (this.options.sourceMap === true) {
      this.options.sourceMap = { inline: false };
    }
  }

  static isSourceMap(input) {
    // All required options for `new SourceMapConsumer(...options)`
    // https://github.com/mozilla/source-map#new-sourcemapconsumerrawsourcemap
    return Boolean(
      input &&
        input.version &&
        input.sources &&
        Array.isArray(input.sources) &&
        typeof input.mappings === 'string'
    );
  }

  static buildSourceMap(inputSourceMap) {
    if (!inputSourceMap || !CssnanoPlugin.isSourceMap(inputSourceMap)) {
      return null;
    }

    return new SourceMapConsumer(inputSourceMap);
  }

  static buildWarning(
    warning,
    file,
    sourceMap,
    requestShortener,
    warningsFilter
  ) {
    let warningMessage = warning;
    let locationMessage = '';
    let source;

    if (sourceMap) {
      const match = warningRegex.exec(warning);

      if (match) {
        const line = +match[1];
        const column = +match[2];
        const original = sourceMap.originalPositionFor({
          line,
          column,
        });

        if (
          original &&
          original.source &&
          original.source !== file &&
          requestShortener
        ) {
          ({ source } = original);
          warningMessage = `${warningMessage.replace(warningRegex, '')}`;

          locationMessage = `[${requestShortener.shorten(original.source)}:${
            original.line
          },${original.column}]`;
        }
      }
    }

    if (warningsFilter && !warningsFilter(warning, file, source)) {
      return null;
    }

    return `Cssnano Webpack Plugin: ${warningMessage}${locationMessage}`;
  }

  *taskGenerator(compiler, compilation, file) {
    const assetSource = compilation.assets[file];

    let input;
    let inputSourceMap;

    // TODO refactor after drop webpack@4, webpack@5 always has `sourceAndMap` on sources
    if (this.options.sourceMap && assetSource.sourceAndMap) {
      const { source, map } = assetSource.sourceAndMap();

      input = source;

      if (map) {
        if (CssnanoPlugin.isSourceMap(map)) {
          inputSourceMap = map;
        } else {
          inputSourceMap = map;

          compilation.warnings.push(
            new Error(`${file} contains invalid source map`)
          );
        }
      }
    } else {
      input = assetSource.source();
      inputSourceMap = null;
    }

    const callback = (taskResult) => {
      const { css: code } = taskResult;
      const { error, map, warnings } = taskResult;

      let sourceMap = null;

      if (error || (warnings && warnings.length > 0)) {
        sourceMap = CssnanoPlugin.buildSourceMap(inputSourceMap);
      }

      // Handling results
      // Error case: add errors, and go to next file
      if (error) {
        compilation.errors.push(
          CssnanoPlugin.buildError(
            error,
            file,
            sourceMap,
            new RequestShortener(compiler.context)
          )
        );

        return;
      }

      let outputSource;

      if (map) {
        outputSource = new SourceMapSource(
          code,
          file,
          JSON.parse(map),
          input,
          inputSourceMap,
          true
        );
      } else {
        outputSource = new RawSource(code);
      }

      // Updating assets
      // eslint-disable-next-line no-param-reassign
      compilation.assets[file] = outputSource;

      // Handling warnings
      if (warnings && warnings.length > 0) {
        warnings.forEach((warning) => {
          const builtWarning = CssnanoPlugin.buildWarning(
            warning,
            file,
            sourceMap,
            new RequestShortener(compiler.context),
            this.options.warningsFilter
          );

          if (builtWarning) {
            compilation.warnings.push(builtWarning);
          }
        });
      }
    };

    const postcssOptions = { to: file, from: file, map: false };

    if (inputSourceMap) {
      postcssOptions.map = Object.assign(
        { prev: inputSourceMap || false },
        this.options.sourceMap
      );
    }

    const task = {
      file,
      input,
      inputSourceMap,
      postcssOptions,
      cssnanoOptions: this.options.cssnanoOptions,
      callback,
    };

    yield task;
  }

  // eslint-disable-next-line class-methods-use-this
  async runTasks(assetNames, getTaskForAsset) {
    const limit = pLimit(100);
    const scheduledTasks = [];

    for (const assetName of assetNames) {
      const enqueue = async (task) => {
        const { input, postcssOptions, cssnanoOptions } = task;

        let taskResult;

        try {
          taskResult = await cssnano.process(
            input,
            postcssOptions,
            cssnanoOptions
          );
        } catch (error) {
          taskResult = { error };
        }

        task.callback(taskResult);

        return taskResult;
      };

      scheduledTasks.push(
        limit(() => {
          const task = getTaskForAsset(assetName).next().value;

          if (!task) {
            // Something went wrong, for example the `cacheKeys` option throw an error
            return Promise.resolve();
          }

          return enqueue(task);
        })
      );
    }

    return Promise.all(scheduledTasks).then(() => {
      return Promise.resolve();
    });
  }

  apply(compiler) {
    const matchObject = ModuleFilenameHelpers.matchObject.bind(
      // eslint-disable-next-line no-undefined
      undefined,
      this.options
    );

    const optimizeFn = async (compilation, chunksOrAssets) => {
      const assetNames = []
        .concat(Array.from(compilation.additionalChunkAssets || []))
        .concat(
          Array.from(chunksOrAssets).reduce(
            (acc, chunk) => acc.concat(Array.from(chunk.files || [])),
            []
          )
        )
        .filter((file) => matchObject(file));

      const getTaskForAsset = this.taskGenerator.bind(
        this,
        compiler,
        compilation
      );

      await this.runTasks(assetNames, getTaskForAsset);

      return Promise.resolve();
    };

    const plugin = { name: this.constructor.name };
    compiler.hooks.compilation.tap(plugin, (compilation) => {
      compilation.hooks.optimizeChunkAssets.tapPromise(
        plugin,
        optimizeFn.bind(this, compilation)
      );
    });
  }
}

module.exports = CssnanoPlugin;
