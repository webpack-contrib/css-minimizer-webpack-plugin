import CssnanoPlugin from '../src/index';

import { getCompiler, compile, readAsset, removeCache } from './helpers';

jest.setTimeout(30000);

describe('when applied with "cssnanoOptions" option', () => {
  beforeEach(() => Promise.all([removeCache()]));

  afterEach(() => Promise.all([removeCache()]));

  it('matches snapshot for "discardComments" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`,
      },
    });
    new CssnanoPlugin().apply(compiler);

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

  it('matches snapshot for "discardComments" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`,
      },
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardComments: false }],
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

  it('matches snapshot for "discardComments" option (enable, with "removeAll" option)', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`,
      },
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardComments: { removeAll: true } }],
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

  it('matches snapshot for "mergeRules" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/mergeRules.css`,
      },
    });
    new CssnanoPlugin().apply(compiler);

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

  it('matches snapshot for "mergeRules" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/mergeRules.css`,
      },
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { mergeRules: false }],
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

  it('matches snapshot for "discardEmpty" option (enable [default])', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardEmpty.css`,
      },
    });
    new CssnanoPlugin().apply(compiler);

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

  it('matches snapshot for "discardEmpty" option (disable)', () => {
    const compiler = getCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardEmpty.css`,
      },
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardEmpty: false }],
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
