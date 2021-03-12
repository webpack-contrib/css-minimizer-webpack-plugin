import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import CssMinimizerPlugin from '../src';

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAssets,
} from './helpers';

describe('"minify" option', () => {
  it('should work with "csso" minifier', async () => {
    const compiler = getCompiler({
      devtool: 'source-map',
      entry: {
        foo: `${__dirname}/fixtures/sourcemap/foo.scss`,
      },
      module: {
        rules: [
          {
            test: /.s?css$/i,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: 'css-loader', options: { sourceMap: true } },
              { loader: 'sass-loader', options: { sourceMap: true } },
            ],
          },
        ],
      },
    });

    new CssMinimizerPlugin({
      minify: async (data, inputMap) => {
        // eslint-disable-next-line global-require
        const csso = require('csso');
        // eslint-disable-next-line global-require
        const sourcemap = require('source-map');

        const [[filename, input]] = Object.entries(data);
        const minifiedCss = csso.minify(input, {
          filename,
          sourceMap: true,
        });

        if (inputMap) {
          minifiedCss.map.applySourceMap(
            new sourcemap.SourceMapConsumer(inputMap),
            filename
          );
        }

        return {
          css: minifiedCss.css,
          map: minifiedCss.map.toJSON(),
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      'assets'
    );
    expect(getErrors(stats)).toMatchSnapshot('error');
    expect(getWarnings(stats)).toMatchSnapshot('warning');
  });

  it('should work with "clean-css" minifier', async () => {
    const compiler = getCompiler({
      devtool: 'source-map',
      entry: {
        foo: `${__dirname}/fixtures/foo.css`,
      },
    });

    new CssMinimizerPlugin({
      minify: async (data) => {
        // eslint-disable-next-line global-require
        const CleanCSS = require('clean-css');
        const [[filename, input]] = Object.entries(data);

        // Bug in `clean-css`
        // `clean-css` doesn't work with URLs in `sources`
        const minifiedCss = await new CleanCSS().minify({
          [filename]: {
            styles: input,
            // sourceMap: inputMap,
          },
        });

        return {
          css: minifiedCss.styles,
          // map: minifiedCss.sourceMap.toJSON(),
          warnings: minifiedCss.warnings,
        };
      },
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      'assets'
    );
    expect(getErrors(stats)).toMatchSnapshot('error');
    expect(getWarnings(stats)).toMatchSnapshot('warning');
  });
});
