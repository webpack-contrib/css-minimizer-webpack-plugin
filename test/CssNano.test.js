import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import CssnanoPlugin from '../src/index';

import { createCompiler, compile } from './compiler';

import { readAsset, normalizedSourceMap } from './helpers';

describe('CssnanoPlugin', () => {
  jest.setTimeout(30000);

  it('should work with assets using querystring', () => {
    const config = {
      devtool: 'source-map',
      entry: {
        entry: `${__dirname}/fixtures/foo.css`,
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css?v=test',
          chunkFilename: '[id].[name].css?v=test',
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

      // eslint-disable-next-line guard-for-in
      for (const file in stats.compilation.assets) {
        // eslint-disable-next-line no-continue

        if (/\.css\?/.test(file)) {
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
});
