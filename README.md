# cssnano-webpack-plugin

[![npm](https://img.shields.io/npm/v/cssnano-webpack-plugin)](https://www.npmjs.com/package/cssnano-webpack-plugin)
[![Build Status](https://travis-ci.org/lneveu/cssnano-webpack-plugin.svg?branch=master)](https://travis-ci.org/lneveu/cssnano-webpack-plugin)

This plugin uses [cssnano](https://cssnano.co) to optimize and minify your CSS.

Fully integrated in Webpack ecosystem: based on compiler hooks, respecting default Webpack output sources and compatible with other plugins like *SourceMapDevToolPlugin* or *webpack-subresource-integrity*.

Just like [optimize-css-assets-webpack-plugin](https://github.com/NMFR/optimize-css-assets-webpack-plugin) but more accurate with source maps and assets using query string.

Works with Webpack 4+.

## Getting Started

First, install `cssnano-webpack-plugin`:

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
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  optimization: {
    minimizer: [
      new CssnanoPlugin()
    ]
  }
};
```

This will enable CSS optimization only in production mode. If you want to run it also in development, put the plugin configuration in the `plugins` option array.

## Options

### `test`

Type: `String|RegExp|Array<String|RegExp>` - default: `/\.css(\?.*)?$/i`

Test to match files against.

```js
module.exports = {
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        test: /\.foo\.css$/i
      })
    ]
  }
};
```

`include` and `exclude` options are also supported (see [module rules](https://webpack.js.org/configuration/module)).

### `sourceMap`

Type: `Boolean|Object` - default: `false`

Enable (and configure) source map support. Use [PostCss SourceMap options](https://github.com/postcss/postcss-loader#sourcemap). Default configuration when enabled: `{ inline: false }`.

```js
module.exports = {
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        sourceMap: true
      })
    ]
  }
};
```

### `cssnanoOptions`

Type: `Object` - default: `{ preset: 'default' }`

Cssnano optimisations [options](https://cssnano.co/guides/optimisations).

```js
module.exports = {
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        cssnanoOptions: {
          preset: ['default', {
            discardComments: { removeAll: true }
          }]
        }
      })
    ]
  }
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
          { loader: 'sass-loader', options: { sourceMap: true } }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [
      new CssnanoPlugin({
        sourceMap: true
      })
    ]
  }
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
          preset: ['default', {
            discardComments: { removeAll: true }
          }]
        }
      })
    ]
  }
};
```

## License

[MIT](./LICENSE)
