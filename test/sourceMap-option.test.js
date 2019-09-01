const CssnanoPlugin = require('../src/index');
const { createCompiler, compile } = require('./helpers');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

describe('when applied with "sourceMap" option', () => {
  jest.setTimeout(30000);
  const baseConfig = {
    devtool: 'sourcemap',
    entry: {
      entry: `${__dirname}/fixtures/sourcemap/foo.scss`,
      entry2: `${__dirname}/fixtures/sourcemap/foo.css`
    },
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].[name].css'
      })
    ]
  };

  it('matches snapshot for "false" value, without previous sourcemap', () => {
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin().apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "true" value, without previous sourcemap', () => {
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin({
      sourceMap: true
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
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
              { loader: 'sass-loader', options: { sourceMap: true } }
            ]
          }
        ]
      }
    });

    const compiler = createCompiler(config);
    new CssnanoPlugin({
      sourceMap: false
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
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
              { loader: 'sass-loader', options: { sourceMap: true } }
            ]
          }
        ]
      }
    });

    const compiler = createCompiler(config);
    new CssnanoPlugin({
      sourceMap: true
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "inline" value', () => {
    const compiler = createCompiler(baseConfig);
    new CssnanoPlugin({
      sourceMap: { inline: true }
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        const { source, map } = stats.compilation.assets[file].sourceAndMap();
        expect(map).toBeNull();
        expect(source).toMatch(/\/\*# sourceMappingURL=data:application\/json;base64,.*\*\//);
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
              { loader: 'sass-loader', options: { sourceMap: true } }
            ]
          }
        ]
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: 'dist/[name].css',
          chunkFilename: 'dist/[id].[name].css'
        }),
        new webpack.SourceMapDevToolPlugin({
          filename: 'sourcemaps/[file].map',
          publicPath: 'https://example.com/project/',
          fileContext: 'dist'
        })
      ]
    });

    const compiler = createCompiler(config);
    new CssnanoPlugin({
      sourceMap: true
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });
});
