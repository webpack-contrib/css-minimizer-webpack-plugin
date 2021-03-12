import * as os from 'os';

import { SourceMapConsumer } from 'source-map';
import { validate } from 'schema-utils';
import serialize from 'serialize-javascript';
import * as cssNanoPackageJson from 'cssnano/package.json';
import pLimit from 'p-limit';
import Worker from 'jest-worker';

import * as schema from './options.json';

import { minify as minifyFn } from './minify';

const warningRegex = /\s.+:+([0-9]+):+([0-9]+)/;

class CssMinimizerPlugin {
  constructor(options = {}) {
    validate(schema, options, {
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
      parallel = true,
      include,
      exclude,
    } = options;

    this.options = {
      test,
      warningsFilter,
      parallel,
      include,
      exclude,
      minify,
      minimizerOptions,
    };
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

  async optimize(compiler, compilation, assets) {
    const assetNames = Object.keys(
      typeof assets === 'undefined' ? compilation.assets : assets
    ).filter((assetName) =>
      compiler.webpack.ModuleFilenameHelpers.matchObject.bind(
        // eslint-disable-next-line no-undefined
        undefined,
        this.options
      )(assetName)
    );

    if (assetNames.length === 0) {
      return Promise.resolve();
    }

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
        workerStdout.on('data', (chunk) => process.stdout.write(chunk));
      }

      const workerStderr = worker.getStderr();

      if (workerStderr) {
        workerStderr.on('data', (chunk) => process.stderr.write(chunk));
      }
    }

    const limit = pLimit(concurrency);
    const { SourceMapSource, RawSource } = compiler.webpack.sources;
    const cache = compilation.getCache('CssMinimizerWebpackPlugin');
    const scheduledTasks = [];

    for (const name of assetNames) {
      scheduledTasks.push(
        limit(async () => {
          const { source: inputSource, info } = compilation.getAsset(name);

          // Skip double minimize assets from child compilation
          if (info.minimized) {
            return;
          }

          let input;
          let inputSourceMap;

          const {
            source: sourceFromInputSource,
            map,
          } = inputSource.sourceAndMap();

          input = sourceFromInputSource;

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

          if (Buffer.isBuffer(input)) {
            input = input.toString();
          }

          const eTag = cache.getLazyHashedEtag(inputSource);

          let output = await cache.getPromise(name, eTag);

          if (!output) {
            try {
              const minimizerOptions = {
                name,
                input,
                inputSourceMap,
                map: this.options.sourceMap,
                minimizerOptions: this.options.minimizerOptions,
                minify: this.options.minify,
              };

              output = await (worker
                ? worker.transform(serialize(minimizerOptions))
                : minifyFn(minimizerOptions));
            } catch (error) {
              compilation.errors.push(
                CssMinimizerPlugin.buildError(
                  error,
                  name,
                  inputSourceMap &&
                    CssMinimizerPlugin.isSourceMap(inputSourceMap)
                    ? new SourceMapConsumer(inputSourceMap)
                    : null,
                  compilation.requestShortener
                )
              );

              return;
            }

            if (output.map) {
              output.source = new SourceMapSource(
                output.code,
                name,
                output.map,
                input,
                inputSourceMap,
                true
              );
            } else {
              output.source = new RawSource(output.code);
            }

            const { source, warnings } = output;

            await cache.storePromise(name, eTag, { source, warnings });
          }

          if (output.warnings && output.warnings.length > 0) {
            output.warnings.forEach((warning) => {
              const builtWarning = CssMinimizerPlugin.buildWarning(
                warning,
                name,
                inputSourceMap && CssMinimizerPlugin.isSourceMap(inputSourceMap)
                  ? new SourceMapConsumer(inputSourceMap)
                  : null,
                compilation.requestShortener,
                this.options.warningsFilter
              );

              if (builtWarning) {
                compilation.warnings.push(builtWarning);
              }
            });
          }

          const newInfo = { minimized: true };
          const { source } = output;

          compilation.updateAsset(name, source, newInfo);
        })
      );
    }

    const result = await Promise.all(scheduledTasks);

    if (worker) {
      await worker.end();
    }

    return result;
  }

  apply(compiler) {
    const pluginName = this.constructor.name;

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      const hooks = compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
        compilation
      );

      const data = serialize({
        terser: cssNanoPackageJson.version,
        terserOptions: this.options.terserOptions,
      });

      hooks.chunkHash.tap(pluginName, (chunk, hash) => {
        hash.update('CssMinimizerPlugin');
        hash.update(data);
      });

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage:
            compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        (assets) => this.optimize(compiler, compilation, assets)
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
    });
  }
}

export default CssMinimizerPlugin;
