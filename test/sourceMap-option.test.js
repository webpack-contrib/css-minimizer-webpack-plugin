import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import webpack from 'webpack';

import CssnanoPlugin from '../src/index';

import { createCompiler, compile } from './compiler';

import { readAsset, normalizedSourceMap, removeCache } from './helpers';

describe('when applied with "sourceMap" option', () => {
  jest.setTimeout(30000);
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
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin().apply(compiler);

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
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin({
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

    const compiler = createCompiler(config);
    new CssnanoPlugin({
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

    const compiler = createCompiler(config);
    new CssnanoPlugin({
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
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin({
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

    const compiler = createCompiler(config);
    new CssnanoPlugin({
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
});
