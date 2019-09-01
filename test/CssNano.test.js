const CssnanoPlugin = require('../src/index');
const { createCompiler, compile } = require('./helpers');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

describe('CssnanoPlugin', () => {
  jest.setTimeout(30000);

  it('should work with assets using querystring', () => {
    const config = {
      devtool: 'sourcemap',
      entry: {
        entry: `${__dirname}/fixtures/foo.css`
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css?v=[chunkhash]',
          chunkFilename: '[id].[name].css?v=[chunkhash]'
        })
      ]
    };

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
