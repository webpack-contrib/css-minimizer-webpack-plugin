export = CssMinimizerPlugin;
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
   * @param {TraceMap} [sourceMap]
   * @param {Compilation["requestShortener"]} [requestShortener]
   * @returns {Error & { hideStack?: boolean, file?: string } | undefined}
   */
  private static buildWarning;
  /**
   * @private
   * @param {Error | ErrorObject | string} error
   * @param {string} file
   * @param {TraceMap} [sourceMap]
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
   * @private
   * @template T
   * @param {BasicMinimizerImplementation<T> & MinimizeFunctionHelpers} implementation
   * @returns {boolean}
   */
  private static isSupportsWorkerThreads;
  /**
   * @param {BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>} [options]
   */
  constructor(
    options?:
      | (BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>)
      | undefined,
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
  export {
    cssnanoMinify,
    cssoMinify,
    cleanCssMinify,
    esbuildMinify,
    parcelCssMinify,
    lightningCssMinify,
    swcMinify,
    Schema,
    Compiler,
    Compilation,
    WebpackError,
    JestWorker,
    RawSourceMap,
    Asset,
    ProcessOptions,
    Syntax,
    Parser,
    Stringifier,
    TraceMap,
    CssNanoOptions,
    Warning,
    WarningObject,
    ErrorObject,
    MinimizedResult,
    Input,
    CustomOptions,
    InferDefaultType,
    MinimizerOptions,
    BasicMinimizerImplementation,
    MinimizeFunctionHelpers,
    MinimizerImplementation,
    InternalOptions,
    InternalResult,
    Parallel,
    Rule,
    Rules,
    WarningsFilter,
    BasePluginOptions,
    MinimizerWorker,
    ProcessOptionsExtender,
    CssNanoOptionsExtended,
    DefinedDefaultMinimizerAndOptions,
    InternalPluginOptions,
  };
}
import { cssnanoMinify } from "./utils";
import { cssoMinify } from "./utils";
import { cleanCssMinify } from "./utils";
import { esbuildMinify } from "./utils";
import { parcelCssMinify } from "./utils";
import { lightningCssMinify } from "./utils";
import { swcMinify } from "./utils";
type Schema = import("schema-utils/declarations/validate").Schema;
type Compiler = import("webpack").Compiler;
type Compilation = import("webpack").Compilation;
type WebpackError = import("webpack").WebpackError;
type JestWorker = import("jest-worker").Worker;
type RawSourceMap = import("@jridgewell/trace-mapping").EncodedSourceMap;
type Asset = import("webpack").Asset;
type ProcessOptions = import("postcss").ProcessOptions;
type Syntax = import("postcss").Syntax;
type Parser = import("postcss").Parser;
type Stringifier = import("postcss").Stringifier;
type TraceMap = import("@jridgewell/trace-mapping").TraceMap;
type CssNanoOptions = {
  configFile?: string | undefined;
  preset?: [string, object] | string | undefined;
};
type Warning =
  | (Error & {
      plugin?: string;
      text?: string;
      source?: string;
    })
  | string;
type WarningObject = {
  message: string;
  plugin?: string | undefined;
  text?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
};
type ErrorObject = {
  message: string;
  line?: number | undefined;
  column?: number | undefined;
  stack?: string | undefined;
};
type MinimizedResult = {
  code: string;
  map?: import("@jridgewell/trace-mapping").EncodedSourceMap | undefined;
  errors?: (string | Error | ErrorObject)[] | undefined;
  warnings?: (Warning | WarningObject)[] | undefined;
};
type Input = {
  [file: string]: string;
};
type CustomOptions = {
  [key: string]: any;
};
type InferDefaultType<T> = T extends infer U ? U : CustomOptions;
type MinimizerOptions<T> = T extends any[]
  ? { [P in keyof T]?: InferDefaultType<T[P]> }
  : InferDefaultType<T>;
type BasicMinimizerImplementation<T> = (
  input: Input,
  sourceMap: RawSourceMap | undefined,
  minifyOptions: InferDefaultType<T>,
) => Promise<MinimizedResult> | MinimizedResult;
type MinimizeFunctionHelpers = {
  supportsWorkerThreads?: (() => boolean | undefined) | undefined;
};
type MinimizerImplementation<T> = T extends any[]
  ? {
      [P in keyof T]: BasicMinimizerImplementation<T[P]> &
        MinimizeFunctionHelpers;
    }
  : BasicMinimizerImplementation<T> & MinimizeFunctionHelpers;
type InternalOptions<T> = {
  name: string;
  input: string;
  inputSourceMap: RawSourceMap | undefined;
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
type InternalResult = {
  outputs: Array<{
    code: string;
    map: RawSourceMap | undefined;
  }>;
  warnings: Array<Warning | WarningObject | string>;
  errors: Array<Error | ErrorObject | string>;
};
type Parallel = undefined | boolean | number;
type Rule = RegExp | string;
type Rules = Rule[] | Rule;
type WarningsFilter = (
  warning: Warning | WarningObject | string,
  file: string,
  source?: string,
) => boolean;
type BasePluginOptions = {
  test?: Rule | undefined;
  include?: Rule | undefined;
  exclude?: Rule | undefined;
  warningsFilter?: WarningsFilter | undefined;
  parallel?: Parallel;
};
type MinimizerWorker<T> = JestWorker & {
  transform: (options: string) => Promise<InternalResult>;
  minify: (options: InternalOptions<T>) => Promise<InternalResult>;
};
type ProcessOptionsExtender =
  | ProcessOptions
  | {
      from?: string;
      to?: string;
      parser?: string | Syntax | Parser;
      stringifier?: string | Syntax | Stringifier;
      syntax?: string | Syntax;
    };
type CssNanoOptionsExtended = CssNanoOptions & {
  processorOptions?: ProcessOptionsExtender;
};
type DefinedDefaultMinimizerAndOptions<T> = T extends CssNanoOptionsExtended
  ? {
      minify?: MinimizerImplementation<T> | undefined;
      minimizerOptions?: MinimizerOptions<T> | undefined;
    }
  : {
      minify: MinimizerImplementation<T>;
      minimizerOptions?: MinimizerOptions<T> | undefined;
    };
type InternalPluginOptions<T> = BasePluginOptions & {
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
