import path from 'path';

import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { createFsFromVolume, Volume } from 'memfs';

module.exports.compile = (compiler) => {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);
      return resolve(stats);
    });
  });
};

module.exports.createCompiler = (options) => {
  const compiler = webpack({
    mode: 'production',
    bail: true,
    cache: false,
    optimization: {
      minimize: false,
    },
    output: {
      pathinfo: false,
      path: `${__dirname}/dist`,
      filename: '[name].js',
      chunkFilename: '[id].[name].js',
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].[name].css',
      }),
    ],
    module: {
      rules: [
        {
          test: /.s?css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    ...options,
  });

  const outputFileSystem = createFsFromVolume(new Volume());
  // Todo remove when we drop webpack@4 support
  outputFileSystem.join = path.join.bind(path);

  compiler.outputFileSystem = outputFileSystem;

  return compiler;
};
