import path from 'path';

import { SourceMapConsumer } from 'source-map';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import RequestShortener from 'webpack/lib/RequestShortener';

import CssnanoPlugin from '../src/index';

import {
  getCompiler,
  getErrors,
  getWarnings,
  compile,
  readAssets,
  readAsset,
  removeCache,
  normalizedSourceMap,
} from './helpers';

jest.setTimeout(30000);

describe('CssnanoPlugin', () => {
  const rawSourceMap = {
    version: 3,
    file: 'test.css',
    names: ['bar', 'baz', 'n'],
    sources: ['one.css', 'two.css'],
    sourceRoot: 'http://example.com/www/js/',
    mappings:
      'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA',
  };

  const emptyRawSourceMap = {
    version: 3,
    sources: [],
    mappings: '',
  };

  beforeEach(() => Promise.all([removeCache()]));

  afterEach(() => Promise.all([removeCache()]));

  it('should respect the hash options #1', () => {
    const compiler = getCompiler({
      output: {
        pathinfo: false,
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        chunkFilename: '[id].[name].js',
        hashDigest: 'hex',
        hashDigestLength: 20,
        hashFunction: 'sha256',
        hashSalt: 'salt',
      },
      entry: {
        entry: `${__dirname}/fixtures/test/foo.css`,
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

  it('should write stdout and stderr of workers to stdout and stderr of main process in parallel mode', async () => {
    const { write: stdoutWrite } = process.stdout;
    const { write: stderrWrite } = process.stderr;

    let stdoutOutput = '';
    let stderrOutput = '';

    process.stdout.write = (str) => {
      stdoutOutput += str;
    };

    process.stderr.write = (str) => {
      stderrOutput += str;
    };

    const compiler = getCompiler({
      entry: {
        one: `${__dirname}/fixtures/entry.js`,
        two: `${__dirname}/fixtures/entry.js`,
      },
    });

    new CssnanoPlugin({
      parallel: true,
      minify: () => {
        // eslint-disable-next-line no-console
        process.stdout.write('stdout\n');
        // eslint-disable-next-line no-console
        process.stderr.write('stderr\n');

        return { css: '.minify {};' };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(stdoutOutput).toMatchSnapshot('process stdout output');
    expect(stderrOutput).toMatchSnapshot('process stderr output');
    expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');

    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  });

  it('isSourceMap method', () => {
    expect(CssnanoPlugin.isSourceMap(null)).toBe(false);
    expect(CssnanoPlugin.isSourceMap()).toBe(false);
    expect(CssnanoPlugin.isSourceMap({})).toBe(false);
    expect(CssnanoPlugin.isSourceMap([])).toBe(false);
    expect(CssnanoPlugin.isSourceMap('foo')).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ version: 3 })).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ sources: '' })).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ mappings: [] })).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ version: 3, sources: '' })).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ version: 3, mappings: [] })).toBe(false);
    expect(CssnanoPlugin.isSourceMap({ sources: '', mappings: [] })).toBe(
      false
    );
    expect(
      CssnanoPlugin.isSourceMap({ version: 3, sources: '', mappings: [] })
    ).toBe(false);
    expect(CssnanoPlugin.isSourceMap(rawSourceMap)).toBe(true);
    expect(CssnanoPlugin.isSourceMap(emptyRawSourceMap)).toBe(true);
  });

  it('buildError method', () => {
    const error = new Error('Message');

    error.stack = null;

    expect(CssnanoPlugin.buildError(error, 'test.css')).toMatchSnapshot();

    const errorWithLineAndCol = new Error('Message');

    errorWithLineAndCol.stack = null;
    errorWithLineAndCol.line = 1;
    errorWithLineAndCol.column = 1;

    expect(
      CssnanoPlugin.buildError(
        errorWithLineAndCol,
        'test.css',
        new SourceMapConsumer(rawSourceMap)
      )
    ).toMatchSnapshot();

    const otherErrorWithLineAndCol = new Error('Message');

    otherErrorWithLineAndCol.stack = null;
    otherErrorWithLineAndCol.line = 1;
    otherErrorWithLineAndCol.column = 1;

    expect(
      CssnanoPlugin.buildError(
        otherErrorWithLineAndCol,
        'test.css',
        new SourceMapConsumer(rawSourceMap),
        new RequestShortener('/example.com/www/js/')
      )
    ).toMatchSnapshot();

    const errorWithStack = new Error('Message');

    errorWithStack.stack = 'Stack';

    expect(
      CssnanoPlugin.buildError(errorWithStack, 'test.css')
    ).toMatchSnapshot();
  });

  it('buildWarning method', () => {
    expect(
      CssnanoPlugin.buildWarning('Warning test.css:1:1')
    ).toMatchSnapshot();
    expect(
      CssnanoPlugin.buildWarning('Warning test.css:1:1', 'test.css')
    ).toMatchSnapshot();
    expect(
      CssnanoPlugin.buildWarning(
        'Warning test.css:1:1',
        'test.css',
        new SourceMapConsumer(rawSourceMap)
      )
    ).toMatchSnapshot();
    expect(
      CssnanoPlugin.buildWarning(
        'Warning test.css:1:1',
        'test.css',
        new SourceMapConsumer(rawSourceMap),
        new RequestShortener('/example.com/www/js/')
      )
    ).toMatchSnapshot();
    expect(
      CssnanoPlugin.buildWarning(
        'Warning test.css:1:1',
        'test.css',
        new SourceMapConsumer(rawSourceMap),
        new RequestShortener('/example.com/www/js/'),
        () => true
      )
    ).toMatchSnapshot();
    expect(
      CssnanoPlugin.buildWarning(
        'Warning test.css:1:1',
        'test.css',
        new SourceMapConsumer(rawSourceMap),
        new RequestShortener('/example.com/www/js/'),
        () => false
      )
    ).toMatchSnapshot();
  });

  it('should build error', () => {
    const compiler = getCompiler({
      entry: {
        foo: `${__dirname}/fixtures/test/foo.css`,
      },
      plugins: [
        new CopyPlugin({
          patterns: [
            {
              context: `${__dirname}/fixtures/test`,
              from: `error.css`,
            },
          ],
        }),
        new MiniCssExtractPlugin({
          filename: '[name].css',
          chunkFilename: '[id].[name].css',
        }),
      ],
    });

    new CssnanoPlugin().apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot('error');
      expect(getWarnings(stats)).toMatchSnapshot('warning');
    });
  });

  it('should build warning', () => {
    const compiler = getCompiler({
      entry: {
        foo: `${__dirname}/fixtures/test/foo.css`,
      },
    });

    new CssnanoPlugin({
      sourceMap: true,
      minify: (data) => {
        // eslint-disable-next-line global-require
        const postcss = require('postcss');

        const plugin = postcss.plugin('warning-plugin', () => (css, result) => {
          let rule;
          css.walkDecls((decl) => {
            rule = decl;
          });

          result.warn('Warning', {
            node: rule,
            word: 'warning_word',
            index: 2,
            plugin: 'warning-plugin',
          });
        });

        return postcss([plugin])
          .process(data.input, data.postcssOptions)
          .then((result) => {
            return {
              css: result.css,
              map: result.map,
              error: result.error,
              warnings: result.warnings(),
            };
          });
      },
    }).apply(compiler);

    return compile(compiler).then((stats) => {
      expect(getErrors(stats)).toMatchSnapshot('error');
      expect(getWarnings(stats)).toMatchSnapshot('warning');
    });
  });

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

    const compiler = getCompiler(config);
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
