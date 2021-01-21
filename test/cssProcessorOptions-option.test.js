import safeParser from 'postcss-safe-parser';

import CssMinimizerPlugin from '../src/index';

import { getCompiler, compile, readAsset, removeCache } from './helpers';

describe('when applied with "processorOptions" option', () => {
  beforeEach(() => Promise.all([removeCache()]));

  afterEach(() => Promise.all([removeCache()]));

  it('matches snapshot for "parser" option (with safe parser)', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/processorOptions/parser.css`,
      },
    });
    new CssMinimizerPlugin({
      parallel: false,
      processorOptions: {
        parser: safeParser,
      },
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
});
