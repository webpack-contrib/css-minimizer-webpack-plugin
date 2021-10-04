import * as os from "os";

import { SourceMapConsumer } from "source-map";
import { validate } from "schema-utils";
import serialize from "serialize-javascript";
import pLimit from "p-limit";
import { Worker } from "jest-worker";

import {
  cssnanoMinify,
  cssoMinify,
  cleanCssMinify,
  esbuildMinify,
} from "./utils";

import * as schema from "./options.json";
import { minify as minifyFn } from "./minify";

const warningRegex = /\s.+:+([0-9]+):+([0-9]+)/;

class CssMinimizerPlugin {
  constructor(options = {}) {
    validate(schema, options, {
      name: "Css Minimizer Plugin",
      baseDataPath: "options",
    });

    const {
      minify = cssnanoMinify,
      minimizerOptions,
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
        typeof input.mappings === "string"
    );
  }

  static buildWarning(
    warning,
    file,
    sourceMap,
    requestShortener,
    warningsFilter
  ) {
    let warningMessage =
      typeof warning === "string"
        ? warning
        : `${warning.plugin ? `[${warning.plugin}] ` : ""}${
            warning.text || warning.message
          }`;
    let locationMessage = "";
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

          warningMessage = `${warningMessage.replace(warningRegex, "")}`;
          locationMessage = `${requestShortener.shorten(original.source)}:${
            original.line
          }:${original.column}`;
        }
      }
    }

    if (warningsFilter && !warningsFilter(warning, file, source)) {
      return null;
    }

    const builtWarning = new Error(
      `${file} from Css Minimizer plugin\n${warningMessage}${
        locationMessage ? ` ${locationMessage}` : ""
      }`
    );

    builtWarning.name = "Warning";
    builtWarning.hideStack = true;
    builtWarning.file = file;

    return builtWarning;
  }

  static buildError(error, file, sourceMap, requestShortener) {
    let builtError;

    if (typeof error === "string") {
      builtError = new Error(`${file} from Css Minimizer plugin\n${error}`);
      builtError.file = file;

      return builtError;
    }

    if (error.line) {
      const original =
        sourceMap &&
        sourceMap.originalPositionFor({
          line: error.line,
          column: error.column,
        });

      if (original && original.source && requestShortener) {
        builtError = new Error(
          `${file} from Css Minimizer plugin\n${
            error.message
          } [${requestShortener.shorten(original.source)}:${original.line},${
            original.column
          }][${file}:${error.line},${error.column}]${
            error.stack
              ? `\n${error.stack.split("\n").slice(1).join("\n")}`
              : ""
          }`
        );
        builtError.file = file;

        return builtError;
      }

      builtError = new Error(
        `${file} from Css Minimizer plugin\n${error.message} [${file}:${
          error.line
        },${error.column}]${
          error.stack ? `\n${error.stack.split("\n").slice(1).join("\n")}` : ""
        }`
      );
      builtError.file = file;

      return builtError;
    }

    if (error.stack) {
      builtError = new Error(
        `${file} from Css Minimizer plugin\n${error.stack}`
      );
      builtError.file = file;

      return builtError;
    }

    builtError = new Error(
      `${file} from Css Minimizer plugin\n${error.message}`
    );
    builtError.file = file;

    return builtError;
  }

  static getAvailableNumberOfCores(parallel) {
    // In some cases cpus() returns undefined
    // https://github.com/nodejs/node/issues/19022
    const cpus = os.cpus() || { length: 1 };

    return parallel === true
      ? cpus.length - 1
      : Math.min(Number(parallel) || 0, cpus.length - 1);
  }

  async optimize(compiler, compilation, assets, optimizeOptions) {
    const cache = compilation.getCache("CssMinimizerWebpackPlugin");
    let numberOfAssetsForMinify = 0;
    const assetsForMinify = await Promise.all(
      Object.keys(typeof assets === "undefined" ? compilation.assets : assets)
        .filter((name) => {
          const { info } = compilation.getAsset(name);

          if (
            // Skip double minimize assets from child compilation
            info.minimized
          ) {
            return false;
          }

          if (
            !compiler.webpack.ModuleFilenameHelpers.matchObject.bind(
              // eslint-disable-next-line no-undefined
              undefined,
              this.options
            )(name)
          ) {
            return false;
          }

          return true;
        })
        .map(async (name) => {
          const { info, source } = compilation.getAsset(name);

          const eTag = cache.getLazyHashedEtag(source);
          const cacheItem = cache.getItemCache(name, eTag);
          const output = await cacheItem.getPromise();

          if (!output) {
            numberOfAssetsForMinify += 1;
          }

          return { name, info, inputSource: source, output, cacheItem };
        })
    );

    let getWorker;
    let initializedWorker;
    let numberOfWorkers;

    if (optimizeOptions.availableNumberOfCores > 0) {
      // Do not create unnecessary workers when the number of files is less than the available cores, it saves memory
      numberOfWorkers = Math.min(
        numberOfAssetsForMinify,
        optimizeOptions.availableNumberOfCores
      );

      getWorker = () => {
        if (initializedWorker) {
          return initializedWorker;
        }

        initializedWorker = new Worker(require.resolve("./minify"), {
          numWorkers: numberOfWorkers,
          enableWorkerThreads: true,
        });

        // https://github.com/facebook/jest/issues/8872#issuecomment-524822081
        const workerStdout = initializedWorker.getStdout();

        if (workerStdout) {
          workerStdout.on("data", (chunk) => process.stdout.write(chunk));
        }

        const workerStderr = initializedWorker.getStderr();

        if (workerStderr) {
          workerStderr.on("data", (chunk) => process.stderr.write(chunk));
        }

        return initializedWorker;
      };
    }

    const limit = pLimit(
      getWorker && numberOfAssetsForMinify > 0 ? numberOfWorkers : Infinity
    );
    const { SourceMapSource, RawSource } = compiler.webpack.sources;
    const scheduledTasks = [];

    for (const asset of assetsForMinify) {
      scheduledTasks.push(
        limit(async () => {
          const { name, inputSource, cacheItem } = asset;
          let { output } = asset;

          if (!output) {
            let input;
            let inputSourceMap;

            const { source: sourceFromInputSource, map } =
              inputSource.sourceAndMap();

            input = sourceFromInputSource;

            if (map) {
              if (CssMinimizerPlugin.isSourceMap(map)) {
                inputSourceMap = map;
              } else {
                compilation.warnings.push(
                  new Error(`${name} contains invalid source map`)
                );
              }
            }

            if (Buffer.isBuffer(input)) {
              input = input.toString();
            }

            const options = {
              name,
              input,
              inputSourceMap,
              minify: this.options.minify,
              minifyOptions: this.options.minimizerOptions,
            };

            let result;

            try {
              result = await (getWorker
                ? getWorker().transform(serialize(options))
                : minifyFn(options));
            } catch (error) {
              const hasSourceMap =
                inputSourceMap &&
                CssMinimizerPlugin.isSourceMap(inputSourceMap);

              compilation.errors.push(
                CssMinimizerPlugin.buildError(
                  error,
                  name,
                  hasSourceMap
                    ? new SourceMapConsumer(inputSourceMap)
                    : // eslint-disable-next-line no-undefined
                      undefined,
                  // eslint-disable-next-line no-undefined
                  hasSourceMap ? compilation.requestShortener : undefined
                )
              );

              return;
            }

            output = { warnings: [], errors: [] };

            for (const item of result.outputs) {
              if (item.map) {
                let originalSource;
                let innerSourceMap;

                if (output.source) {
                  ({ source: originalSource, map: innerSourceMap } =
                    output.source.sourceAndMap());
                } else {
                  originalSource = input;
                  innerSourceMap = inputSourceMap;
                }

                // TODO need API for merging source maps in `webpack-source`
                output.source = new SourceMapSource(
                  item.code,
                  name,
                  item.map,
                  originalSource,
                  innerSourceMap,
                  true
                );
              } else {
                output.source = new RawSource(item.code);
              }
            }

            if (result.errors && result.errors.length > 0) {
              const hasSourceMap =
                inputSourceMap &&
                CssMinimizerPlugin.isSourceMap(inputSourceMap);

              for (const error of result.errors) {
                output.warnings.push(
                  CssMinimizerPlugin.buildError(
                    error,
                    name,
                    hasSourceMap
                      ? new SourceMapConsumer(inputSourceMap)
                      : // eslint-disable-next-line no-undefined
                        undefined,
                    // eslint-disable-next-line no-undefined
                    hasSourceMap ? compilation.requestShortener : undefined
                  )
                );
              }
            }

            if (result.warnings && result.warnings.length > 0) {
              const hasSourceMap =
                inputSourceMap &&
                CssMinimizerPlugin.isSourceMap(inputSourceMap);

              for (const warning of result.warnings) {
                const buildWarning = CssMinimizerPlugin.buildWarning(
                  warning,
                  name,
                  hasSourceMap
                    ? new SourceMapConsumer(inputSourceMap)
                    : // eslint-disable-next-line no-undefined
                      undefined,
                  // eslint-disable-next-line no-undefined
                  hasSourceMap ? compilation.requestShortener : undefined,
                  this.options.warningsFilter
                );

                if (buildWarning) {
                  output.warnings.push(buildWarning);
                }
              }
            }

            await cacheItem.storePromise({
              source: output.source,
              warnings: output.warnings,
              errors: output.errors,
            });
          }

          if (output.warnings && output.warnings.length > 0) {
            for (const warning of output.warnings) {
              compilation.warnings.push(warning);
            }
          }

          if (output.errors && output.errors.length > 0) {
            for (const error of output.errors) {
              compilation.errors.push(error);
            }
          }

          const newInfo = { minimized: true };
          const { source } = output;

          compilation.updateAsset(name, source, newInfo);
        })
      );
    }

    const result = await Promise.all(scheduledTasks);

    if (initializedWorker) {
      await initializedWorker.end();
    }

    return result;
  }

  apply(compiler) {
    const pluginName = this.constructor.name;
    const availableNumberOfCores = CssMinimizerPlugin.getAvailableNumberOfCores(
      this.options.parallel
    );

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage:
            compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        (assets) =>
          this.optimize(compiler, compilation, assets, {
            availableNumberOfCores,
          })
      );

      compilation.hooks.statsPrinter.tap(pluginName, (stats) => {
        stats.hooks.print
          .for("asset.info.minimized")
          .tap(
            "css-minimizer-webpack-plugin",
            (minimized, { green, formatFlag }) =>
              // eslint-disable-next-line no-undefined
              minimized ? green(formatFlag("minimized")) : ""
          );
      });
    });
  }
}

CssMinimizerPlugin.cssnanoMinify = cssnanoMinify;
CssMinimizerPlugin.cssoMinify = cssoMinify;
CssMinimizerPlugin.cleanCssMinify = cleanCssMinify;
CssMinimizerPlugin.esbuildMinify = esbuildMinify;

export default CssMinimizerPlugin;
