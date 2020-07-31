<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![cover][cover]][cover-url]
[![chat][chat]][chat-url]
[![size][size]][size-url]

# cssnano-webpack-plugin

This plugin uses [cssnano](https://cssnano.co) to optimize and minify your CSS.

Fully integrated in Webpack ecosystem: based on compiler hooks, respecting default Webpack output sources and compatible with other plugins like _SourceMapDevToolPlugin_ or _webpack-subresource-integrity_.

Just like [optimize-css-assets-webpack-plugin](https://github.com/NMFR/optimize-css-assets-webpack-plugin) but more accurate with source maps and assets using query string.

Works with Webpack 4+.

## Getting Started

To begin, you'll need to install `cssnano-webpack-plugin`:

```console
$ npm install cssnano-webpack-plugin --save-dev
```

Then add the plugin to your `webpack` configuration. For example:

**webpack.config.js**

```js
const CssnanoPlugin = require('cssnano-webpack-plugin');

module.exports = {
  module: {
    loaders: [
      {
        test: /.s?css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new CssnanoPlugin()],
  },
};
```

This will enable CSS optimization only in production mode. If you want to run it also in development, put the plugin configuration in the `plugins` option array.
And run `webpack` via your preferred method.

## Options

### `test`

Type: `String|RegExp|Array<String|RegExp>` - default: `/\.css(\?.*)?$/i`

Test to match files against.

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        test: /\.foo\.css$/i,
      }),
    ],
  },
};
```

### `include`

Type: `String|RegExp|Array<String|RegExp>`
Default: `undefined`

Files to include.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        include: /\/includes/,
      }),
    ],
  },
};
```

### `exclude`

Type: `String|RegExp|Array<String|RegExp>`
Default: `undefined`

Files to exclude.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        exclude: /\/excludes/,
      }),
    ],
  },
};
```

### `cache`

> ⚠ Ignored in webpack 5! Please use https://webpack.js.org/configuration/other-options/#cache.

Type: `Boolean|String`
Default: `true`

Enable file caching.
Default path to cache directory: `node_modules/.cache/cssnano-webpack-plugin`.

> ℹ️ If you use your own `minify` function please read the `minify` section for cache invalidation correctly.

#### `Boolean`

Enable/disable file caching.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        cache: true,
      }),
    ],
  },
};
```

#### `String`

Enable file caching and set path to cache directory.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        cache: 'path/to/cache',
      }),
    ],
  },
};
```

### `cacheKeys`

> ⚠ Ignored in webpack 5! Please use https://webpack.js.org/configuration/other-options/#cache.

Type: `Function<(defaultCacheKeys, file) -> Object>`
Default: `defaultCacheKeys => defaultCacheKeys`

Allows you to override default cache keys.

Default cache keys:

```js
({
  cssnano: require('cssnano/package.json').version, // cssnano version
  'cssnano-webpack-plugin': require('../package.json').version, // plugin version
  'cssnano-webpack-plugin-options': this.options, // plugin options
  path: compiler.outputPath ? `${compiler.outputPath}/${file}` : file, // asset path
  hash: crypto.createHash('md4').update(input).digest('hex'), // source file hash
});
```

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        cache: true,
        cacheKeys: (defaultCacheKeys, file) => {
          defaultCacheKeys.myCacheKey = 'myCacheKeyValue';

          return defaultCacheKeys;
        },
      }),
    ],
  },
};
```

### `parallel`

Type: `Boolean|Number`
Default: `true`

Use multi-process parallel running to improve the build speed.
Default number of concurrent runs: `os.cpus().length - 1`.

> ℹ️ Parallelization can speedup your build significantly and is therefore **highly recommended**.

#### `Boolean`

Enable/disable multi-process parallel running.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        parallel: true,
      }),
    ],
  },
};
```

#### `Number`

Enable multi-process parallel running and set number of concurrent runs.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        parallel: 4,
      }),
    ],
  },
};
```

### `sourceMap`

Type: `Boolean|Object`
Default: `false` (see below for details around `devtool` value and `SourceMapDevToolPlugin` plugin)

Enable (and configure) source map support. Use [PostCss SourceMap options](https://github.com/postcss/postcss-loader#sourcemap).
Default configuration when enabled: `{ inline: false }`.

**Works only with `source-map`, `inline-source-map`, `hidden-source-map` and `nosources-source-map` values for the [`devtool`](https://webpack.js.org/configuration/devtool/) option.**

Why?

- `eval` wraps modules in `eval("string")` and the minimizer does not handle strings.
- `cheap` has not column information and minimizer generate only a single line, which leave only a single mapping.

The plugin respect the [`devtool`](https://webpack.js.org/configuration/devtool/) and using the `SourceMapDevToolPlugin` plugin.
Using supported `devtool` values enable source map generation.
Using `SourceMapDevToolPlugin` with enabled the `columns` option enables source map generation.

Use source maps to map error message locations to modules (this slows down the compilation).
If you use your own `minify` function please read the `minify` section for handling source maps correctly.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        sourceMap: true,
      }),
    ],
  },
};
```

### `minify`

Type: `Function`
Default: `undefined`

Allows you to override default minify function.
By default plugin uses [cssnano](https://github.com/cssnano/cssnano) package.
Useful for using and testing unpublished versions or forks.

> ⚠️ **Always use `require` inside `minify` function when `parallel` option enabled**.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        minify: (data) => {
          const postcss = require('postcss');
          const { input, postcssOptions, cssnanoOptions } = data;

          const plugin = postcss.plugin(
            'custom-plugin',
            () => (css, result) => {
              // custom code
            }
          );

          return postcss([plugin])
            .process(input, postcssOptions)
            .then((result) => {
              return {
                css: result.css,
                map: result.map,
                error: result.error,
                warnings: result.warnings(),
              };
            });
        },
      }),
    ],
  },
};
```

### `cssnanoOptions`

Type: `Object`
Default: `{ preset: 'default' }`

Cssnano optimisations [options](https://cssnano.co/guides/optimisations).

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        cssnanoOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
};
```

### `warningsFilter`

Type: `Function<(warning, file, source) -> Boolean>`
Default: `() => true`

Allow to filter [cssnano](https://github.com/cssnano/cssnano) warnings.
Return `true` to keep the warning, a falsy value (`false`/`null`/`undefined`) otherwise.

> ⚠️ The `source` argument will contain `undefined` if you don't use source maps.

**webpack.config.js**

```js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssnanoPlugin({
        warningsFilter: (warning, file, source) => {
          if (/Dropping unreachable code/i.test(warning)) {
            return true;
          }

          if (/file\.css/i.test(file)) {
            return true;
          }

          if (/source\.css/i.test(source)) {
            return true;
          }

          return false;
        },
      }),
    ],
  },
};
```

## Examples

### Use sourcemaps

Don't forget to enable `sourceMap` options for all loaders.

```js
const CssnanoPlugin = require('cssnano-webpack-plugin');

module.exports = {
  module: {
    loaders: [
      {
        test: /.s?css$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { sourceMap: true } },
          { loader: 'sass-loader', options: { sourceMap: true } },
        ],
      },
    ],
  },
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        sourceMap: true,
      }),
    ],
  },
};
```

### Remove all comments

Remove all comments (including comments starting with `/*!`).

```js
module.exports = {
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        cssnanoOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
};
```

## Contributing

Please take a moment to read our contributing guidelines if you haven't yet done so.

[CONTRIBUTING](./.github/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/cssnano-webpack-plugin.svg
[npm-url]: https://npmjs.com/package/cssnano-webpack-plugin
[node]: https://img.shields.io/node/v/cssnano-webpack-plugin.svg
[node-url]: https://nodejs.org
[deps]: https://david-dm.org/webpack-contrib/cssnano-webpack-plugin.svg
[deps-url]: https://david-dm.org/webpack-contrib/cssnano-webpack-plugin
[tests]: https://github.com/webpack-contrib/cssnano-webpack-plugin/workflows/cssnano-webpack-plugin/badge.svg
[tests-url]: https://github.com/webpack-contrib/cssnano-webpack-plugin/actions
[cover]: https://codecov.io/gh/webpack-contrib/cssnano-webpack-plugin/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/webpack-contrib/cssnano-webpack-plugin
[chat]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[chat-url]: https://gitter.im/webpack/webpack
[size]: https://packagephobia.now.sh/badge?p=cssnano-webpack-plugin
[size-url]: https://packagephobia.now.sh/result?p=cssnano-webpack-plugin
