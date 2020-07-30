import os from 'os';

import pLimit from 'p-limit';
import RequestShortener from 'webpack/lib/RequestShortener';
import cssnanoPackageJson from 'cssnano/package.json';
import {
  util,
  ModuleFilenameHelpers,
  SourceMapDevToolPlugin,
  javascript,
  version as webpackVersion,
} from 'webpack';
import { SourceMapSource, RawSource } from 'webpack-sources';
import { SourceMapConsumer } from 'source-map';
import validateOptions from 'schema-utils';
import serialize from 'serialize-javascript';
import Worker from 'jest-worker';

import schema from './options.json';

import { minify as minifyFn } from './minify';

const warningRegex = /\s.+:+([0-9]+):+([0-9]+)/;

class CssnanoPlugin {
  constructor(options = {}) {
    validateOptions(schema, options, {
      name: 'Cssnano Plugin',
      baseDataPath: 'options',
    });

    const {
      minify,
      cssnanoOptions = {
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
      cssnanoOptions,
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

  static buildSourceMap(inputSourceMap) {
    if (!inputSourceMap || !CssnanoPlugin.isSourceMap(inputSourceMap)) {
      return null;
    }

    return new SourceMapConsumer(inputSourceMap);
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
          `${file} from Cssnano Webpack Plugin\n${
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
        `${file} from Cssnano \n${error.message} [${file}:${error.line},${
          error.column
        }]${
          error.stack ? `\n${error.stack.split('\n').slice(1).join('\n')}` : ''
        }`
      );
    }

    if (error.stack) {
      return new Error(`${file} from Cssnano\n${error.stack}`);
    }

    return new Error(`${file} from Cssnano\n${error.message}`);
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

    return `Cssnano Plugin: ${warningMessage} ${locationMessage}`;
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

    if (Buffer.isBuffer(input)) {
      input = input.toString();
    }

    const callback = (taskResult) => {
      const { css: code, error, map, warnings } = taskResult;

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
          map,
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

    const postcssOptions = { to: file, from: file };

    const task = {
      input,
      inputSourceMap,
      postcssOptions,
      map: this.options.sourceMap,
      cssnanoOptions: this.options.cssnanoOptions,
      minify: this.options.minify,
      callback,
    };

    if (CssnanoPlugin.isWebpack4()) {
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
          cssnano: cssnanoPackageJson.version,
          // eslint-disable-next-line global-require
          'cssnano-webpack-plugin': require('../package.json').version,
          'cssnano-webpack-plugin-options': this.options,
          nodeVersion: process.version,
          filename: file,
          contentHash: digest.substr(0, hashDigestLength),
        };

        task.cacheKeys = this.options.cacheKeys(defaultCacheKeys, file);
      }
    } else {
      // For webpack@5 cache
      task.assetSource = assetSource;

      task.cacheKeys = {
        cssnano: cssnanoPackageJson.version,
        // eslint-disable-next-line global-require
        'cssnano-webpack-plugin': require('../package.json').version,
        'cssnano-webpack-plugin-options': this.options,
      };
    }

    yield task;
  }

  // eslint-disable-next-line class-methods-use-this
  async runTasks(assetNames, getTaskForAsset, cache) {
    const availableNumberOfCores = CssnanoPlugin.getAvailableNumberOfCores(
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
          taskResult = await cache.store(task, taskResult).then(
            () => taskResult,
            () => taskResult
          );
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

          if (cache.isEnabled()) {
            return cache.get(task).then(
              (taskResult) => task.callback(taskResult),
              () => enqueue(task)
            );
          }

          return enqueue(task);
        })
      );
    }

    return Promise.all(scheduledTasks).then(() => {
      if (worker) {
        return worker.end();
      }

      return Promise.resolve();
    });
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
        CssnanoPlugin.isWebpack4() ? compilation.assets : chunksOrAssets
      ).filter((file) => matchObject(file));

      if (assetNames.length === 0) {
        return Promise.resolve();
      }

      const getTaskForAsset = this.taskGenerator.bind(
        this,
        compiler,
        compilation
      );

      const CacheEngine = CssnanoPlugin.isWebpack4()
        ? // eslint-disable-next-line global-require
          require('./Webpack4Cache').default
        : // eslint-disable-next-line global-require
          require('./Webpack5Cache').default;
      const cache = new CacheEngine(compilation, { cache: this.options.cache });

      await this.runTasks(assetNames, getTaskForAsset, cache);

      return Promise.resolve();
    };

    const plugin = { name: this.constructor.name };

    compiler.hooks.compilation.tap(plugin, (compilation) => {
      if (this.options.sourceMap) {
        compilation.hooks.buildModule.tap(plugin, (moduleArg) => {
          // to get detailed location info about errors
          // eslint-disable-next-line no-param-reassign
          moduleArg.useSourceMap = true;
        });
      }

      if (CssnanoPlugin.isWebpack4()) {
        const { mainTemplate, chunkTemplate } = compilation;
        const data = serialize({
          cssnano: cssnanoPackageJson.version,
          cssnanoOptions: this.options.cssnanoOptions,
        });

        // Regenerate `contenthash` for minified assets
        for (const template of [mainTemplate, chunkTemplate]) {
          template.hooks.hashForChunk.tap(plugin, (hash) => {
            hash.update('CssnanoPlugin');
            hash.update(data);
          });
        }

        compilation.hooks.optimizeChunkAssets.tapPromise(
          plugin,
          optimizeFn.bind(this, compilation)
        );
      } else {
        const hooks = javascript.JavascriptModulesPlugin.getCompilationHooks(
          compilation
        );
        const data = serialize({
          cssnano: cssnanoPackageJson.version,
          cssnanoOptions: this.options.cssnanoOptions,
        });

        hooks.chunkHash.tap(plugin, (chunk, hash) => {
          hash.update('CssnanoPlugin');
          hash.update(data);
        });

        compilation.hooks.optimizeAssets.tapPromise(
          plugin,
          optimizeFn.bind(this, compilation)
        );
      }
    });
  }
}

export default CssnanoPlugin;
