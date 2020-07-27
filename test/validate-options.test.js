import CssnanoWebpackPlugin from '../src';

it('validation', () => {
  /* eslint-disable no-new */
  expect(() => {
    new CssnanoWebpackPlugin({ test: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ test: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ test: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ include: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ include: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ include: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: /foo/ });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: 'foo' });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: [/foo/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: [/foo/, /bar/] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: ['foo', 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: [/foo/, 'bar'] });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: true });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ exclude: [true] });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ sourceMap: true });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ sourceMap: false });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ sourceMap: { inline: true } });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ sourceMap: 'true' });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({ cssnanoOptions: {} });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ cssnanoOptions: null });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new CssnanoWebpackPlugin({
      cssnanoOptions: { colormin: true },
    });
  }).not.toThrow();

  expect(() => {
    new CssnanoWebpackPlugin({ unknown: true });
  }).toThrowErrorMatchingSnapshot();
  /* eslint-enable no-new */
});
