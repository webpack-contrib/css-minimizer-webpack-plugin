import path from 'path';

import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { createFsFromVolume, Volume } from 'memfs';

export default function getCompiler(options) {
  const compiler = webpack({
    mode: 'production',
    bail: true,
    cache: getCompiler.isWebpack4() ? false : { type: 'memory' },
    optimization: {
      minimize: false,
      noEmitOnErrors: false,
    },
    output: {
      pathinfo: false,
      path: path.resolve(__dirname, 'dist'),
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
}

getCompiler.isWebpack4 = () => webpack.version[0] === '4';
