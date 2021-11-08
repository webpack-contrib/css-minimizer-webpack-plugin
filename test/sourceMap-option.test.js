import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

import CssMinimizerPlugin from "../src/index";

import {
  getCompiler,
  compile,
  readAssets,
  getErrors,
  getWarnings,
} from "./helpers";

expect.addSnapshotSerializer({
  test: (value) => {
    // For string that are valid JSON
    if (typeof value !== "string") {
      return false;
    }

    try {
      return typeof JSON.parse(value) === "object";
    } catch (e) {
      return false;
    }
  },
  print: (value) => JSON.stringify(JSON.parse(value), null, 4),
});

describe('when applied with "sourceMap" option', () => {
  const baseConfig = {
    devtool: "source-map",
    entry: {
      entry: `${__dirname}/fixtures/sourcemap/foo.scss`,
      entry2: `${__dirname}/fixtures/sourcemap/foo.css`,
    },
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].css",
        chunkFilename: "[id].[name].css",
      }),
    ],
  };

  it('should work with the "devtool" option', async () => {
    const compiler = getCompiler(baseConfig);

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it('should work with the "devtool" option and the "parallel" option with "false" value', async () => {
    const compiler = getCompiler(baseConfig);

    new CssMinimizerPlugin({
      parallel: false,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it('should work with the "devtool" option and the "parallel" option with "true" value', async () => {
    const compiler = getCompiler(baseConfig);

    new CssMinimizerPlugin({
      parallel: true,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work with SourceMapDevToolPlugin plugin)", async () => {
    const config = Object.assign(baseConfig, {
      devtool: false,
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
      plugins: [
        new MiniCssExtractPlugin({
          filename: "dist/[name].css",
          chunkFilename: "dist/[id].[name].css",
        }),
        new webpack.SourceMapDevToolPlugin({
          filename: "sourcemaps/[file].map",
          publicPath: "https://example.com/project/",
          fileContext: "dist",
        }),
      ],
    });

    const compiler = getCompiler(config);

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work and emit warnings on broken sourcemaps", async () => {
    const emitBrokenSourceMapPlugin = new (class EmitBrokenSourceMapPlugin {
      apply(pluginCompiler) {
        pluginCompiler.hooks.compilation.tap(
          { name: this.constructor.name },
          (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: this.constructor.name,
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
              },
              () => {
                compilation.additionalChunkAssets.push("broken-source-map.css");

                const assetContent = ".bar {color: red};";

                // eslint-disable-next-line no-param-reassign
                compilation.assets["broken-source-map.css"] = {
                  size() {
                    return assetContent.length;
                  },
                  source() {
                    return assetContent;
                  },
                  sourceAndMap() {
                    return {
                      source: this.source(),
                      map: {
                        sources: [],
                        names: [],
                        mappings: "AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO",
                        file: "x",
                        sourcesContent: [],
                      },
                    };
                  },
                };
              }
            );
          }
        );
      }
    })();

    const config = Object.assign(baseConfig, {
      devtool: "source-map",
      entry: {
        entry2: `${__dirname}/fixtures/sourcemap/foo.css`,
      },
      plugins: [
        emitBrokenSourceMapPlugin,
        new MiniCssExtractPlugin({
          filename: "dist/[name].css",
          chunkFilename: "dist/[id].[name].css",
        }),
      ],
    });

    const compiler = getCompiler(config);

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets"
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(stats.compilation.warnings[0].toString()).toMatch(
      "contains invalid source map"
    );
  });

  it("should work and emit warning on valid sourcemap and minimizer error", async () => {
    const emitBrokenSourceMapPlugin = new (class EmitBrokenSourceMapPlugin {
      apply(pluginCompiler) {
        pluginCompiler.hooks.compilation.tap(
          { name: this.constructor.name },
          (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: this.constructor.name,
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
              },
              () => {
                compilation.additionalChunkAssets.push("broken-source-map.css");

                const assetContent = ".bar {color: red};";

                // eslint-disable-next-line no-param-reassign
                compilation.assets["broken-source-map.css"] = {
                  size() {
                    return assetContent.length;
                  },
                  source() {
                    return assetContent;
                  },
                  sourceAndMap() {
                    return {
                      source: this.source(),
                      map: {
                        version: 3,
                        sources: ["test", "test2"],
                        names: [],
                        mappings: "AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO",
                        file: "x",
                        sourcesContent: [],
                      },
                    };
                  },
                };
              }
            );
          }
        );
      }
    })();

    const config = Object.assign(baseConfig, {
      devtool: "source-map",
      entry: {
        entry2: `${__dirname}/fixtures/sourcemap/foo.css`,
      },
      plugins: [
        emitBrokenSourceMapPlugin,
        new MiniCssExtractPlugin({
          filename: "dist/[name].css",
          chunkFilename: "dist/[id].[name].css",
        }),
      ],
    });

    const compiler = getCompiler(config);

    new CssMinimizerPlugin({
      minify: (data) => {
        // eslint-disable-next-line global-require
        const postcss = require("postcss");

        const plugin = postcss.plugin("error-plugin", () => (css) => {
          css.walkDecls((decl) => {
            throw decl.error("Postcss error");
          });
        });

        const [[filename, input]] = Object.entries(data);

        return postcss([plugin])
          .process(input, { from: filename, to: filename })
          .then((result) => result);
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should work and do not contain sourcemap link in minified source", async () => {
    const compiler = getCompiler({
      devtool: false,
      entry: {
        foo: `${__dirname}/fixtures/foo.css`,
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);
    const assets = readAssets(compiler, stats, /\.css$/);
    const [[, input]] = Object.entries(assets);

    expect(/sourceMappingURL/i.test(input)).toBe(false);
  });
});
