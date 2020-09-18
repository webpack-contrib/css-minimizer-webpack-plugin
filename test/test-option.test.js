import CssMinimizerPlugin from '../src/index';

import {
  getCompiler,
  compile,
  readAssets,
  removeCache,
  getErrors,
  getWarnings,
} from './helpers';

describe('when applied with "test" option', () => {
  let compiler;

  beforeEach(() => {
    Promise.all([removeCache()]);

    compiler = getCompiler({
      entry: {
        bar1: `${__dirname}/fixtures/test/bar1.css`,
        bar2: `${__dirname}/fixtures/test/bar2.css`,
        foo: `${__dirname}/fixtures/test/foo.css`,
      },
    });
  });

  afterEach(() => Promise.all([removeCache()]));

  it('matches snapshot with empty value', async () => {
    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('matches snapshot for a single "test" value (RegExp)', async () => {
    new CssMinimizerPlugin({
      test: /bar.*\.css$/,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('matches snapshot for multiple "test" value (RegExp)', async () => {
    new CssMinimizerPlugin({
      test: [/bar1.*\.css$/, /bar2.*\.css$/],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });
});
