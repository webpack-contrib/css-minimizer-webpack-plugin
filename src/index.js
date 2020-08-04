import os from 'os';

import { SourceMapConsumer } from 'source-map';
import { SourceMapSource, RawSource } from 'webpack-sources';
import RequestShortener from 'webpack/lib/RequestShortener';
import {
  util,
  ModuleFilenameHelpers,
  SourceMapDevToolPlugin,
  version as webpackVersion,
} from 'webpack';
import validateOptions from 'schema-utils';
import serialize from 'serialize-javascript';
import CssMinimizerPackageJson from 'cssnano/package.json';
import pLimit from 'p-limit';
import Worker from 'jest-worker';

import schema from './options.json';

import { minify as minifyFn } from './minify';

const warningRegex = /\s.+:+([0-9]+):+([0-9]+)/;

class CssMinimizerPlugin {
  constructor(options = {}) {
    validateOptions(schema, options, {
      name: 'Css Minimizer Plugin',
      baseDataPath: 'options',
    });

    const {
      minify,
      minimizerOptions = {
        preset: 'default',
      },
      test = /\.css(\?.*)?$/i,
      warningsFilter = () => true,
      sourceMap = false,
      cache = true,
      cacheKeys = (defaultCacheKeys) => defaultCacheKeys,
      parallel = true,
      include,
      exclude,
    } = options;

    this.options = {
      test,
      warningsFilter,
      sourceMap,
      cache,
      cacheKeys,
      parallel,
      include,
      exclude,
      minify,
      minimizerOptions,
    };

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

  static buildError(error, file, sourceMap, requestShortener) {
    if (error.line) {
      const original =
        sourceMap &&
        sourceMap.originalPositionFor({
          line: error.line,
          column: error.column,
        });

      if (original && original.source && requestShortener) {
        return new Error(
          `${file} from Css Minimizer Webpack Plugin\n${
            error.message
          } [${requestShortener.shorten(original.source)}:${original.line},${
            original.column
          }][${file}:${error.line},${error.column}]${
            error.stack
              ? `\n${error.stack.split('\n').slice(1).join('\n')}`
              : ''
          }`
        );
      }

      return new Error(
        `${file} from Css Minimizer \n${error.message} [${file}:${error.line},${
          error.column
        }]${
          error.stack ? `\n${error.stack.split('\n').slice(1).join('\n')}` : ''
        }`
      );
    }

    if (error.stack) {
      return new Error(`${file} from Css Minimizer\n${error.stack}`);
    }

    return new Error(`${file} from Css Minimizer\n${error.message}`);
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
          locationMessage = `${requestShortener.shorten(original.source)}:${
            original.line
          }:${original.column}`;
        }
      }
    }

    if (warningsFilter && !warningsFilter(warning, file, source)) {
      return null;
    }

    return `Css Minimizer Plugin: ${warningMessage} ${locationMessage}`;
  }

  static isWebpack4() {
    return webpackVersion[0] === '4';
  }

  static getAvailableNumberOfCores(parallel) {
    // In some cases cpus() returns undefined
    // https://github.com/nodejs/node/issues/19022
    const cpus = os.cpus() || { length: 1 };

    return parallel === true
      ? cpus.length - 1
      : Math.min(Number(parallel) || 0, cpus.length - 1);
  }

  // eslint-disable-next-line consistent-return
  static getAsset(compilation, name) {
    // New API
    if (compilation.getAsset) {
      return compilation.getAsset(name);
    }

    if (compilation.assets[name]) {
      return { name, source: compilation.assets[name], info: {} };
    }
  }

  static updateAsset(compilation, name, newSource, assetInfo) {
    // New API
    if (compilation.updateAsset) {
      compilation.updateAsset(name, newSource, assetInfo);
    }

    // eslint-disable-next-line no-param-reassign
    compilation.assets[name] = newSource;
  }

  *taskGenerator(compiler, compilation, name) {
    const { info, source: assetSource } = CssMinimizerPlugin.getAsset(
      compilation,
      name
    );

    // Skip double minimize assets from child compilation
    if (info.minimized) {
      yield false;
    }

    let input;
    let inputSourceMap;

    // TODO refactor after drop webpack@4, webpack@5 always has `sourceAndMap` on sources
    if (this.options.sourceMap && assetSource.sourceAndMap) {
      const { source, map } = assetSource.sourceAndMap();

      input = source;

      if (map) {
        if (CssMinimizerPlugin.isSourceMap(map)) {
          inputSourceMap = map;
        } else {
          inputSourceMap = map;

          compilation.warnings.push(
            new Error(`${name} contains invalid source map`)
          );
        }
      }
    } else {
      input = assetSource.source();
      inputSourceMap = null;
    }

    if (Buffer.isBuffer(input)) {
      input = input.toString();
    }

    const callback = (taskResult) => {
      const { css: code, error, map, warnings } = taskResult;

      let sourceMap = null;

      if (
        (error || (warnings && warnings.length > 0)) &&
        inputSourceMap &&
        CssMinimizerPlugin.isSourceMap(inputSourceMap)
      ) {
        sourceMap = new SourceMapConsumer(inputSourceMap);
      }

      // Handling results
      // Error case: add errors, and go to next file
      if (error) {
        compilation.errors.push(
          CssMinimizerPlugin.buildError(
            error,
            name,
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
          name,
          map,
          input,
          inputSourceMap,
          true
        );
      } else {
        outputSource = new RawSource(code);
      }

      CssMinimizerPlugin.updateAsset(compilation, name, outputSource, {
        ...info,
        minimized: true,
      });

      // Handling warnings
      if (warnings && warnings.length > 0) {
        warnings.forEach((warning) => {
          const builtWarning = CssMinimizerPlugin.buildWarning(
            warning,
            name,
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

    const task = {
      name,
      input,
      inputSourceMap,
      map: this.options.sourceMap,
      minimizerOptions: this.options.minimizerOptions,
      minify: this.options.minify,
      callback,
    };

    if (CssMinimizerPlugin.isWebpack4()) {
      const {
        outputOptions: { hashSalt, hashDigest, hashDigestLength, hashFunction },
      } = compilation;
      const hash = util.createHash(hashFunction);

      if (hashSalt) {
        hash.update(hashSalt);
      }

      hash.update(input);

      const digest = hash.digest(hashDigest);

      if (this.options.cache) {
        const defaultCacheKeys = {
          cssMinimizer: CssMinimizerPackageJson.version,
          // eslint-disable-next-line global-require
          'css-minimizer-webpack-plugin': require('../package.json').version,
          'css-minimizer-webpack-plugin-options': this.options,
          nodeVersion: process.version,
          filename: name,
          contentHash: digest.substr(0, hashDigestLength),
        };

        task.cacheKeys = this.options.cacheKeys(defaultCacheKeys, name);
      }
    } else {
      // For webpack@5 cache
      task.assetSource = assetSource;
    }

    yield task;
  }

  // eslint-disable-next-line class-methods-use-this
  async runTasks(assetNames, getTaskForAsset, cache) {
    const availableNumberOfCores = CssMinimizerPlugin.getAvailableNumberOfCores(
      this.options.parallel
    );

    let concurrency = Infinity;
    let worker;

    if (availableNumberOfCores > 0) {
      // Do not create unnecessary workers when the number of files is less than the available cores, it saves memory
      const numWorkers = Math.min(assetNames.length, availableNumberOfCores);

      concurrency = numWorkers;

      worker = new Worker(require.resolve('./minify'), { numWorkers });

      // https://github.com/facebook/jest/issues/8872#issuecomment-524822081
      const workerStdout = worker.getStdout();

      if (workerStdout) {
        workerStdout.on('data', (chunk) => {
          return process.stdout.write(chunk);
        });
      }

      const workerStderr = worker.getStderr();

      if (workerStderr) {
        workerStderr.on('data', (chunk) => {
          return process.stderr.write(chunk);
        });
      }
    }

    const limit = pLimit(concurrency);
    const scheduledTasks = [];

    for (const assetName of assetNames) {
      const enqueue = async (task) => {
        let taskResult;

        try {
          if (worker) {
            taskResult = await worker.transform(serialize(task));
          } else {
            taskResult = await minifyFn(task);
          }
        } catch (error) {
          taskResult = { error };
        }

        if (cache.isEnabled() && !taskResult.error) {
          await cache.store(task, taskResult);
        }

        task.callback(taskResult);

        return taskResult;
      };

      scheduledTasks.push(
        limit(async () => {
          const task = getTaskForAsset(assetName).next().value;

          if (!task) {
            // Something went wrong, for example the `cacheKeys` option throw an error
            return Promise.resolve();
          }

          if (cache.isEnabled()) {
            let taskResult;

            try {
              taskResult = await cache.get(task);
            } catch (ignoreError) {
              return enqueue(task);
            }

            // Webpack@5 return `undefined` when cache is not found
            if (!taskResult) {
              return enqueue(task);
            }

            task.callback(taskResult);

            return Promise.resolve();
          }

          return enqueue(task);
        })
      );
    }

    await Promise.all(scheduledTasks);

    if (worker) {
      await worker.end();
    }
  }

  apply(compiler) {
    const { devtool, plugins } = compiler.options;

    this.options.sourceMap =
      typeof this.options.sourceMap === 'undefined'
        ? (devtool &&
            !devtool.includes('eval') &&
            !devtool.includes('cheap') &&
            (devtool.includes('source-map') ||
              // Todo remove when `webpack@4` support will be dropped
              devtool.includes('sourcemap'))) ||
          (plugins &&
            plugins.some(
              (plugin) =>
                plugin instanceof SourceMapDevToolPlugin &&
                plugin.options &&
                plugin.options.columns
            ))
        : this.options.sourceMap;

    const matchObject = ModuleFilenameHelpers.matchObject.bind(
      // eslint-disable-next-line no-undefined
      undefined,
      this.options
    );

    const optimizeFn = async (compilation, chunksOrAssets) => {
      const assetNames = Object.keys(
        CssMinimizerPlugin.isWebpack4() ? compilation.assets : chunksOrAssets
      ).filter((file) => matchObject(file));

      if (assetNames.length === 0) {
        return Promise.resolve();
      }

      const getTaskForAsset = this.taskGenerator.bind(
        this,
        compiler,
        compilation
      );

      const CacheEngine = CssMinimizerPlugin.isWebpack4()
        ? // eslint-disable-next-line global-require
          require('./Webpack4Cache').default
        : // eslint-disable-next-line global-require
          require('./Webpack5Cache').default;
      const cache = new CacheEngine(compilation, { cache: this.options.cache });

      await this.runTasks(assetNames, getTaskForAsset, cache);

      return Promise.resolve();
    };

    const pluginName = this.constructor.name;

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      if (this.options.sourceMap) {
        compilation.hooks.buildModule.tap(pluginName, (moduleArg) => {
          // to get detailed location info about errors
          // eslint-disable-next-line no-param-reassign
          moduleArg.useSourceMap = true;
        });
      }

      if (CssMinimizerPlugin.isWebpack4()) {
        compilation.hooks.optimizeChunkAssets.tapPromise(
          pluginName,
          optimizeFn.bind(this, compilation)
        );
      } else {
        // eslint-disable-next-line global-require
        const Compilation = require('webpack/lib/Compilation');

        compilation.hooks.processAssets.tapPromise(
          {
            name: pluginName,
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          },
          optimizeFn.bind(this, compilation)
        );

        compilation.hooks.statsPrinter.tap(pluginName, (stats) => {
          stats.hooks.print
            .for('asset.info.minimized')
            .tap(
              'css-minimizer-webpack-plugin',
              (minimized, { green, formatFlag }) =>
                // eslint-disable-next-line no-undefined
                minimized ? green(formatFlag('minimized')) : undefined
            );
        });
      }
    });
  }
}

export default CssMinimizerPlugin;
