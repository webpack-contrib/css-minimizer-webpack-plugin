const CssnanoPlugin = require('../src/index');
const { createCompiler, compile } = require('./helpers');

describe('when applied with "cssnanoOptions" option', () => {
  jest.setTimeout(30000);

  it('matches snapshot for "discardComments" option (enable [default])', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`
      }
    });
    new CssnanoPlugin().apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardComments" option (disable)', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`
      }
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardComments: false }]
      }
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardComments" option (enable, with "removeAll" option)', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardComments.css`
      }
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardComments: { removeAll: true } }]
      }
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "mergeRules" option (enable [default])', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/mergeRules.css`
      }
    });
    new CssnanoPlugin().apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "mergeRules" option (disable)', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/mergeRules.css`
      }
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { mergeRules: false }]
      }
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardEmpty" option (enable [default])', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardEmpty.css`
      }
    });
    new CssnanoPlugin().apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });

  it('matches snapshot for "discardEmpty" option (disable)', () => {
    const compiler = createCompiler({
      entry: {
        entry: `${__dirname}/fixtures/cssnanooptions/discardEmpty.css`
      }
    });
    new CssnanoPlugin({
      cssnanoOptions: {
        preset: ['default', { discardEmpty: false }]
      }
    }).apply(compiler);

    return compile(compiler).then(stats => {
      expect(stats.compilation.errors).toEqual([]);
      expect(stats.compilation.warnings).toEqual([]);

      for (const file in stats.compilation.assets) {
        if (/\.js$/.test(file)) continue;
        expect(stats.compilation.assets[file].source()).toMatchSnapshot(file);
      }
    });
  });
});
