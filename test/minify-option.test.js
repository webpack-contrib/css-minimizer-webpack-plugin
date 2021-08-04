import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyPlugin from "copy-webpack-plugin";

import CssMinimizerPlugin from "../src";

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAsset,
  readAssets,
} from "./helpers";

describe('"minify" option', () => {
  it('should work with "csso" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async (data, inputSourceMap) => {
        // eslint-disable-next-line global-require
        const csso = require("csso");
        // eslint-disable-next-line global-require
        const sourcemap = require("source-map");

        const [[filename, input]] = Object.entries(data);
        const minifiedCss = csso.minify(input, {
          filename,
          sourceMap: inputSourceMap,
        });

        if (inputSourceMap) {
          minifiedCss.map.applySourceMap(
            new sourcemap.SourceMapConsumer(inputSourceMap),
            filename
          );
        }

        return {
          code: minifiedCss.css,
          map: minifiedCss.map && minifiedCss.map.toJSON(),
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "clean-css" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/foo.css`,
      },
    });

    new CssMinimizerPlugin({
      minify: async (data) => {
        // eslint-disable-next-line global-require
        const CleanCSS = require("clean-css");
        const [[filename, input]] = Object.entries(data);

        // Bug in `clean-css`
        // `clean-css` doesn't work with URLs in `sources`
        const minifiedCss = await new CleanCSS().minify({
          [filename]: {
            styles: input,
            // sourceMap: inputMap,
          },
        });

        return {
          code: minifiedCss.styles,
          // map: minifiedCss.sourceMap.toJSON(),
          warnings: minifiedCss.warnings,
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work if minify is array && minimizerOptions is array", async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: [
        { test: ".one{background: white;}" },
        { test: ".two{background: white;}" },
        { test: ".three{background: white;}" },
      ],
      minify: [
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.one{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.two{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.three{color: red;}\n${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it("should work if minify is array && minimizerOptions is object", async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: { test: ".one{background: white;}" },
      minify: [
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.one{color: red;}\n/*HERE*/${minimizerOptions.test}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap, minimizerOptions) => {
          const [input] = Object.values(data);
          return {
            code: `/*HERE*/${minimizerOptions.test}\n${input}\n.two{color: red;}\n`,
            map: inputMap,
          };
        },
        async (data, inputMap) => {
          const [input] = Object.values(data);
          return {
            code: `${input}\n.three{color: red;}\n`,
            map: inputMap,
          };
        },
      ],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify"', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: "default",
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cssnanoMinify" and parser option as "String"', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        entry: `${__dirname}/fixtures/sugarss.js`,
      },
      module: {},
      plugins: [
        new CopyPlugin({
          patterns: [
            {
              context: `${__dirname}/fixtures/sss`,
              from: `index.sss`,
            },
          ],
        }),
        new MiniCssExtractPlugin({
          filename: "[name].css",
        }),
      ],
    });

    new CssMinimizerPlugin({
      test: /\.(css|sss)$/i,
      minimizerOptions: {
        processorOptions: {
          parser: "sugarss",
        },
      },
      minify: [CssMinimizerPlugin.cssnanoMinify],
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue
        if (/\.js$/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('should work with "CssMinimizerPlugin.cssoMinify" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: "css-loader", options: { sourceMap: true } },
              { loader: "sass-loader", options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cssoMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });

  it('should work with "CssMinimizerPlugin.cleanCssMinify" minifier', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        foo: `${__dirname}/fixtures/foo.css`,
      },
    });

    new CssMinimizerPlugin({
      minify: CssMinimizerPlugin.cleanCssMinify,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("error");
    expect(getWarnings(stats)).toMatchSnapshot("warning");
  });
});
