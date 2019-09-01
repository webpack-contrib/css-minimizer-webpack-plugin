const cssnano = require('cssnano');
const { ModuleFilenameHelpers } = require('webpack');
const { SourceMapSource, RawSource } = require('webpack-sources');

class CssnanoPlugin {
  constructor(options) {
    this.options = Object.assign(
      {
        test: /\.css(\?.*)?$/i,
        sourceMap: false,
        cssnanoOptions: {
          preset: 'default'
        }
      },
      options
    );

    if (this.options.sourceMap === true) {
      this.options.sourceMap = { inline: false };
    }
  }

  apply(compiler) {
    const plugin = { name: this.constructor.name };
    compiler.hooks.compilation.tap(plugin, compilation => {
      compilation.hooks.optimizeChunkAssets.tapPromise(plugin, chunks => {
        return Promise.all(
          Array.from(chunks)
            .reduce((acc, chunk) => acc.concat(chunk.files || []), [])
            .filter(ModuleFilenameHelpers.matchObject.bind(null, this.options))
            .map(file => {
              let input, inputSourceMap;
              const asset = compilation.assets[file];
              const postcssOpts = { to: file, from: file, map: false };

              if (this.options.sourceMap) {
                if (asset.sourceAndMap) {
                  const { source, map } = asset.sourceAndMap();
                  input = source;
                  inputSourceMap = map;
                } else {
                  input = asset.source();
                  inputSourceMap = null;
                }
                postcssOpts.map = Object.assign(
                  { prev: inputSourceMap || false },
                  this.options.sourceMap
                );
              } else {
                input = asset.source();
                inputSourceMap = null;
              }

              return cssnano
                .process(input, postcssOpts, this.options.cssnanoOptions)
                .then(res => {
                  if (res.map) {
                    compilation.assets[file] = new SourceMapSource(
                      res.css,
                      file,
                      JSON.parse(res.map),
                      input,
                      inputSourceMap,
                      true
                    );
                  } else {
                    compilation.assets[file] = new RawSource(res.css);
                  }
                })
                .catch(error => {
                  compilation.errors.push(
                    new Error(
                      `Cssnano error. File: "${file}"\n${
                        error.stack ? error.stack : error.message
                      }`
                    )
                  );
                });
            })
        );
      });
    });
  }
}

module.exports = CssnanoPlugin;
