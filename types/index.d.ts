export default CssMinimizerPlugin;
export type Schema = import("schema-utils/declarations/validate").Schema;
export type Compiler = import("webpack").Compiler;
export type Compilation = import("webpack").Compilation;
export type WebpackError = import("webpack").WebpackError;
export type JestWorker = import("jest-worker").Worker;
export type RawSourceMap = import("source-map").RawSourceMap;
export type CssNanoOptions = import("cssnano").CssNanoOptions;
export type Asset = import("webpack").Asset;
export type ProcessOptions = import("postcss").ProcessOptions;
export type Syntax = import("postcss").Syntax;
export type Parser = import("postcss").Parser;
export type Stringifier = import("postcss").Stringifier;
export type Warning =
  | (Error & {
      plugin?: string;
      text?: string;
      source?: string;
    })
  | string;
export type WarningObject = {
  message: string;
  plugin?: string | undefined;
  text?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
};
export type ErrorObject = {
  message: string;
  line?: number | undefined;
  column?: number | undefined;
  stack?: string | undefined;
};
export type MinimizedResult = {
  code: string;
  map?: import("source-map").RawSourceMap | undefined;
  errors?: (string | Error | ErrorObject)[] | undefined;
  warnings?: (Warning | WarningObject)[] | undefined;
};
export type Input = {
  [file: string]: string;
};
export type BasicMinimizerImplementation<T> = (
  input: Input,
  sourceMap: RawSourceMap | undefined,
  minifyOptions: T
) => Promise<MinimizedResult>;
export type MinimizerImplementation<T> = T extends any[]
  ? { [P in keyof T]: BasicMinimizerImplementation<T[P]> }
  : BasicMinimizerImplementation<T>;
export type MinimizerOptions<T> = T extends any[]
  ? { [P in keyof T]?: T[P] | undefined }
  : T;
export type InternalOptions<T> = {
  name: string;
  input: string;
  inputSourceMap: RawSourceMap | undefined;
  minimizer: {
    implementation: MinimizerImplementation<InferDefaultType<T>>;
    options: MinimizerOptions<InferDefaultType<T>>;
  };
};
export type InternalResult = {
  outputs: Array<{
    code: string;
    map: RawSourceMap | undefined;
  }>;
  warnings: Array<Warning | WarningObject | string>;
  errors: Array<Error | ErrorObject | string>;
};
export type Parallel = undefined | boolean | number;
export type Rule = RegExp | string;
export type Rules = Rule[] | Rule;
export type WarningsFilter = (
  warning: Warning | WarningObject | string,
  file: string,
  source?: string | undefined
) => boolean;
export type BasePluginOptions = {
  test?: Rules | undefined;
  include?: Rules | undefined;
  exclude?: Rules | undefined;
  warningsFilter?: WarningsFilter | undefined;
  parallel?: Parallel;
};
export type MinimizerWorker<T> = Worker & {
  transform: (options: string) => InternalResult;
  minify: (options: InternalOptions<T>) => InternalResult;
};
export type CustomOptions = {
  [key: string]: any;
};
export type InferDefaultType<T> = T extends infer U ? U : CustomOptions;
export type ProcessOptionsExtender =
  | ProcessOptions
  | {
      from?: string;
      to?: string;
      parser?: string | Syntax | Parser;
      stringifier?: string | Syntax | Stringifier;
      syntax?: string | Syntax;
    };
export type CssNanoOptionsExtended = CssNanoOptions & {
  processorOptions?: ProcessOptionsExtender;
};
export type DefinedDefaultMinimizerAndOptions<T> =
  T extends CssNanoOptionsExtended
    ? {
        minify?: MinimizerImplementation<InferDefaultType<T>> | undefined;
        minimizerOptions?: MinimizerOptions<InferDefaultType<T>> | undefined;
      }
    : {
        minify: MinimizerImplementation<InferDefaultType<T>>;
        minimizerOptions?: MinimizerOptions<InferDefaultType<T>> | undefined;
      };
export type InternalPluginOptions<T> = BasePluginOptions & {
  minimizer: {
    implementation: MinimizerImplementation<InferDefaultType<T>>;
    options: MinimizerOptions<InferDefaultType<T>>;
  };
};
/**
 * @template [T=CssNanoOptionsExtended]
 */
declare class CssMinimizerPlugin<T = CssNanoOptionsExtended> {
  /**
   * @private
   * @param {any} input
   * @returns {boolean}
   */
  private static isSourceMap;
  /**
   * @private
   * @param {Warning | WarningObject | string} warning
   * @param {string} file
   * @param {WarningsFilter} [warningsFilter]
   * @param {SourceMapConsumer} [sourceMap]
   * @param {Compilation["requestShortener"]} [requestShortener]
   * @returns {Error & { hideStack?: boolean, file?: string } | undefined}
   */
  private static buildWarning;
  /**
   * @private
   * @param {Error | ErrorObject | string} error
   * @param {string} file
   * @param {SourceMapConsumer} [sourceMap]
   * @param {Compilation["requestShortener"]} [requestShortener]
   * @returns {Error}
   */
  private static buildError;
  /**
   * @private
   * @param {Parallel} parallel
   * @returns {number}
   */
  private static getAvailableNumberOfCores;
  /**
   * @param {BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>} [options]
   */
  constructor(
    options?:
      | (BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>)
      | undefined
  );
  /**
   * @private
   * @type {InternalPluginOptions<T>}
   */
  private options;
  /**
   * @private
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {Record<string, import("webpack").sources.Source>} assets
   * @param {{availableNumberOfCores: number}} optimizeOptions
   * @returns {Promise<void>}
   */
  private optimize;
  /**
   * @param {Compiler} compiler
   * @returns {void}
   */
  apply(compiler: Compiler): void;
}
declare namespace CssMinimizerPlugin {
  export { cssnanoMinify };
  export { cssoMinify };
  export { cleanCssMinify };
  export { esbuildMinify };
}
import { Worker } from "jest-worker";
import { cssnanoMinify } from "./utils";
import { cssoMinify } from "./utils";
import { cleanCssMinify } from "./utils";
import { esbuildMinify } from "./utils";
