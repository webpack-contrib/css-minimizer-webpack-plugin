const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const CssnanoPlugin = require('../src/index');

const { createCompiler, compile } = require('./helpers');

describe('CssnanoPlugin', () => {
  jest.setTimeout(30000);

  it('should work with assets using querystring', () => {
    const config = {
      devtool: 'sourcemap',
      entry: {
        entry: `${__dirname}/fixtures/foo.css`,
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css?v=[chunkhash]',
          chunkFilename: '[id].[name].css?v=[chunkhash]',
        }),
      ],
    };

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
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });
});
