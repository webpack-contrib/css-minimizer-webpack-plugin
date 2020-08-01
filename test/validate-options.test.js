import CssMinimizerPlugin from '../src';

it('validation', () => {
  /* eslint-disable no-new */
  expect(() => {
    new CssMinimizerPlugin({ test: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ test: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ test: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ include: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ include: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ include: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ exclude: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ exclude: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ exclude: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ sourceMap: true });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ sourceMap: false });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ sourceMap: { inline: true } });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ sourceMap: 'true' });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ minimizerOptions: {} });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ minimizerOptions: null });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({
      minimizerOptions: { colormin: true },
    });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ cache: true });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ cache: false });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ cache: 'path/to/cache/directory' });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ cache: {} });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ cacheKeys() {} });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ cacheKeys: 'test' });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ parallel: true });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ parallel: false });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ parallel: 2 });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ parallel: '2' });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ parallel: {} });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ minify() {} });
  }).not.toThrow();

  expect(() => {
    new CssMinimizerPlugin({ minify: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssMinimizerPlugin({ unknown: true });
  }).toThrowErrorMatchingSnapshot();
  /* eslint-enable no-new */
});
