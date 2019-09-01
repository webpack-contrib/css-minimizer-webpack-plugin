'use strict';

const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MemoryFileSystem = require('memory-fs');

module.exports.compile = function(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);
      return resolve(stats);
    });
  });
};

module.exports.createCompiler = function(options) {
  const compiler = webpack({
    mode: 'production',
    bail: true,
    cache: false,
    optimization: {
      minimize: false
    },
    output: {
      pathinfo: false,
      path: `${__dirname}/dist`,
      filename: '[name].[chunkhash].js',
      chunkFilename: '[id].[name].[chunkhash].js'
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].[chunkhash].css',
        chunkFilename: '[id].[name].[chunkhash].css'
      })
    ],
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader']
        }
      ]
    },
    ...options
  });
  compiler.outputFileSystem = new MemoryFileSystem();
  return compiler;
};
