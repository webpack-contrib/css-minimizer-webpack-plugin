import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import CssMinimizerPlugin from '../src/index';

import {
  getCompiler,
  compile,
  readAsset,
  normalizedSourceMap,
  removeCache,
  getErrors,
  getWarnings,
} from './helpers';

jest.setTimeout(30000);

describe('when applied with "sourceMap" option', () => {
  const baseConfig = {
    devtool: 'source-map',
    entry: {
      entry: `${__dirname}/fixtures/sourcemap/foo.scss`,
      entry2: `${__dirname}/fixtures/sourcemap/foo.css`,
    },
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].[name].css',
      }),
    ],
  };

  beforeEach(() => Promise.all([removeCache()]));

  afterEach(() => Promise.all([removeCache()]));

  it('matches snapshot for "false" value, without previous sourcemap', () => {
    const compiler = getCompiler(baseConfig);
    new CssMinimizerPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue
        if (/\.js/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "true" value, without previous sourcemap', () => {
    const compiler = getCompiler(baseConfig);
    new CssMinimizerPlugin({
      sourceMap: true,
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      // eslint-disable-next-line guard-for-in
      for (const file in stats.compilation.assets) {
        if (/\.css$/.test(file)) {
          expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
        }

        // eslint-disable-next-line no-continue
        if (!/\.css.map/.test(file)) continue;
        expect(
          normalizedSourceMap(readAsset(file, compiler, stats))
        ).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "false" value, using previous sourcemap', () => {
    const config = Object.assign(baseConfig, {
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: 'css-loader', options: { sourceMap: true } },
              { loader: 'sass-loader', options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    const compiler = getCompiler(config);
    new CssMinimizerPlugin({
      sourceMap: false,
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue
        if (/\.js/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "true" value, using previous sourcemap', () => {
    const config = Object.assign(baseConfig, {
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: 'css-loader', options: { sourceMap: true } },
              { loader: 'sass-loader', options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    const compiler = getCompiler(config);
    new CssMinimizerPlugin({
      sourceMap: true,
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      // eslint-disable-next-line guard-for-in
      for (const file in stats.compilation.assets) {
        if (/\.css$/.test(file)) {
          expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
        }

        // eslint-disable-next-line no-continue
        if (!/\.css.map/.test(file)) continue;
        expect(
          normalizedSourceMap(readAsset(file, compiler, stats))
        ).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "inline" value', () => {
    const compiler = getCompiler(baseConfig);
    new CssMinimizerPlugin({
      sourceMap: { inline: true },
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue
        if (/\.js/.test(file)) continue;
        const map = Object.keys(stats.compilation.assets).filter((i) =>
          i.includes('css.map')
        );
        expect(map.length).toBe(0);
        expect(readAsset(file, compiler, stats)).toMatch(
          /\/\*# sourceMappingURL=data:application\/json;base64,.*\*\//
        );
      }
    });
  });

  it('matches snapshot when using SourceMapDevToolPlugin (with filename, publicPath and fileContext options)', () => {
    const config = Object.assign(baseConfig, {
      devtool: false,
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: 'css-loader', options: { sourceMap: true } },
              { loader: 'sass-loader', options: { sourceMap: true } },
            ],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: 'dist/[name].css',
          chunkFilename: 'dist/[id].[name].css',
        }),
        new webpack.SourceMapDevToolPlugin({
          filename: 'sourcemaps/[file].map',
          publicPath: 'https://example.com/project/',
          fileContext: 'dist',
        }),
      ],
    });

    const compiler = getCompiler(config);
    new CssMinimizerPlugin({
      sourceMap: true,
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue
        if (/\.js/.test(file)) continue;
        expect(readAsset(file, compiler, stats)).toMatchSnapshot(file);
      }
    });
  });

  it('should emit warning when broken sourcemap', () => {
    const emitBrokenSourceMapPlugin = new (class EmitBrokenSourceMapPlugin {
      apply(pluginCompiler) {
        pluginCompiler.hooks.compilation.tap(
          { name: this.constructor.name },
          (compilation) => {
            compilation.hooks.additionalChunkAssets.tap(
              { name: this.constructor.name },
              () => {
                compilation.additionalChunkAssets.push('broken-source-map.css');

                const assetContent = '.bar {color: red};';

                // eslint-disable-next-line no-param-reassign
                compilation.assets['broken-source-map.css'] = {
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
                        mappings: 'AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO',
                        file: 'x',
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
      entry: {
        entry2: `${__dirname}/fixtures/sourcemap/foo.css`,
      },
      plugins: [
        emitBrokenSourceMapPlugin,
        new MiniCssExtractPlugin({
          filename: 'dist/[name].css',
          chunkFilename: 'dist/[id].[name].css',
        }),
      ],
    });

    const compiler = getCompiler(config);
    new CssMinimizerPlugin({
      sourceMap: true,
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot('error');
      expect(getWarnings(stats)).toMatchSnapshot('warning');
    });
  });
});
