import os from 'os';
import crypto from 'crypto';

import { SourceMapConsumer } from 'source-map';
import RequestShortener from 'webpack/lib/RequestShortener';
import webpack, {
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

// webpack 5 exposes the sources property to ensure the right version of webpack-sources is used
const { SourceMapSource, RawSource } =
  // eslint-disable-next-line global-require
  webpack.sources || require('webpack-sources');

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

  *getTask(compiler, compilation, assetName) {
    const {
      info: assetInfo,
      source: assetSource,
    } = CssMinimizerPlugin.getAsset(compilation, assetName);

    // Skip double minimize assets from child compilation
    if (assetInfo.minimized) {
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
            new Error(`${assetName} contains invalid source map`)
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

    const task = {
      assetSource,
      assetInfo,
      assetName,
      input,
      inputSourceMap,
      map: this.options.sourceMap,
      minimizerOptions: this.options.minimizerOptions,
      minify: this.options.minify,
    };

    if (CssMinimizerPlugin.isWebpack4()) {
      if (this.options.cache) {
        const defaultCacheKeys = {
          nodeVersion: process.version,
          // eslint-disable-next-line global-require
          'css-minimizer-webpack-plugin': require('../package.json').version,
          cssMinimizer: CssMinimizerPackageJson.version,
          'css-minimizer-webpack-plugin-options': this.options,
          assetName,
          contentHash: crypto.createHash('md4').update(input).digest('hex'),
        };

        task.cacheKeys = this.options.cacheKeys(defaultCacheKeys, assetName);
      }
    }

    yield task;
  }

  // eslint-disable-next-line class-methods-use-this
  async runTasks(compiler, compilation, assetNames, CacheEngine, weakCache) {
    const cache = new CacheEngine(
      compilation,
      {
        cache: this.options.cache,
      },
      weakCache
    );
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
      scheduledTasks.push(
        limit(async () => {
          const task = this.getTask(compiler, compilation, assetName).next()
            .value;

          if (!task) {
            return Promise.resolve();
          }

          let resultOutput = await cache.get(task, {
            RawSource,
            SourceMapSource,
          });

          const { inputSourceMap } = task;

          let sourceMap;

          if (!resultOutput) {
            try {
              // eslint-disable-next-line no-param-reassign
              resultOutput = worker
                ? await worker.transform(serialize(task))
                : await minifyFn(task);
            } catch (error) {
              task.error = error;
            }

            task.error = task.error || resultOutput.error;

            if (task.error) {
              if (
                inputSourceMap &&
                CssMinimizerPlugin.isSourceMap(inputSourceMap)
              ) {
                sourceMap = new SourceMapConsumer(inputSourceMap);
              }

              compilation.errors.push(
                CssMinimizerPlugin.buildError(
                  task.error,
                  assetName,
                  sourceMap,
                  new RequestShortener(compiler.context)
                )
              );

              return Promise.resolve();
            }

            task.css = resultOutput.css;
            task.map = resultOutput.map;
            task.warnings = resultOutput.warnings;

            const { css: code, map, input } = task;

            if (map) {
              task.source = new SourceMapSource(
                code,
                assetName,
                map,
                input,
                inputSourceMap,
                true
              );
            } else {
              task.source = new RawSource(code);
            }

            await cache.store(task);
          } else {
            task.source = resultOutput.source;
            task.warnings = resultOutput.warnings;
          }

          if (task.warnings && task.warnings.length > 0) {
            if (
              inputSourceMap &&
              CssMinimizerPlugin.isSourceMap(inputSourceMap)
            ) {
              sourceMap = new SourceMapConsumer(inputSourceMap);
            }

            task.warnings.forEach((warning) => {
              const builtWarning = CssMinimizerPlugin.buildWarning(
                warning,
                assetName,
                sourceMap,
                new RequestShortener(compiler.context),
                this.options.warningsFilter
              );

              if (builtWarning) {
                compilation.warnings.push(builtWarning);
              }
            });
          }

          const { source, assetInfo } = task;

          CssMinimizerPlugin.updateAsset(compilation, assetName, source, {
            ...assetInfo,
            minimized: true,
          });

          return Promise.resolve();
        })
      );
    }

    await Promise.all(scheduledTasks);

    if (worker) {
      await worker.end();
    }
  }

  static isWebpack4() {
    return webpackVersion[0] === '4';
  }

  apply(compiler) {
    const pluginName = this.constructor.name;
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

    const weakCache = new WeakMap();

    const optimizeFn = async (compilation, CacheEngine, assets) => {
      const assetNames = Object.keys(
        typeof assets === 'undefined' ? compilation.assets : assets
      ).filter((assetName) => matchObject(assetName));

      if (assetNames.length === 0) {
        return Promise.resolve();
      }

      await this.runTasks(
        compiler,
        compilation,
        assetNames,
        CacheEngine,
        weakCache
      );

      return Promise.resolve();
    };

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      if (this.options.sourceMap) {
        compilation.hooks.buildModule.tap(pluginName, (moduleArg) => {
          // to get detailed location info about errors
          // eslint-disable-next-line no-param-reassign
          moduleArg.useSourceMap = true;
        });
      }

      if (CssMinimizerPlugin.isWebpack4()) {
        // eslint-disable-next-line global-require
        const CacheEngine = require('./Webpack4Cache').default;

        compilation.hooks.optimizeChunkAssets.tapPromise(pluginName, () =>
          // eslint-disable-next-line no-undefined
          optimizeFn(compilation, CacheEngine, undefined, weakCache)
        );
      } else {
        if (this.options.sourceMap) {
          compilation.hooks.buildModule.tap(pluginName, (moduleArg) => {
            // to get detailed location info about errors
            // eslint-disable-next-line no-param-reassign
            moduleArg.useSourceMap = true;
          });
        }

        // eslint-disable-next-line global-require
        const CacheEngine = require('./Webpack5Cache').default;

        // eslint-disable-next-line global-require
        const Compilation = require('webpack/lib/Compilation');

        compilation.hooks.processAssets.tapPromise(
          {
            name: pluginName,
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          },
          (assets) => optimizeFn(compilation, CacheEngine, assets)
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
