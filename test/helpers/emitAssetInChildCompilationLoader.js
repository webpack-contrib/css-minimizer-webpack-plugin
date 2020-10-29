class PreCopyPlugin {
  constructor(options = {}) {
    this.options = options.options || {};
  }

  // eslint-disable-next-line class-methods-use-this
  apply(compiler) {
    const plugin = { name: 'PreCopyPlugin' };
    const { RawSource } = compiler.webpack.sources;

    compiler.hooks.compilation.tap(plugin, (compilation) => {
      compilation.hooks.additionalAssets.tapAsync(plugin, (callback) => {
        compilation.emitAsset(
          'entry.css',
          new RawSource('.entry {\n  text-align: center;\n}\n\n')
        );

        callback();
      });
    });
  }
}

export default function loader() {
  const callback = this.async();

  const childCompiler = this._compilation.createChildCompiler(
    `preloader`,
    this.options
  );

  new PreCopyPlugin().apply(childCompiler);

  childCompiler.runAsChild((error) => {
    if (error) {
      return callback(error);
    }

    return callback(null, 'export default 1');
  });
}
