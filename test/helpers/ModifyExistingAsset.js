export default class ExistingCommentsFile {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    const plugin = { name: this.constructor.name };
    const { ConcatSource } = compiler.webpack.sources;

    compiler.hooks.thisCompilation.tap(plugin, (compilation) => {
      compilation.hooks.additionalAssets.tap(plugin, () => {
        compilation.assets[this.options.name] = new ConcatSource(
          "a { color: red; }",
          compilation.assets[this.options.name],
        );
      });
    });
  }
}
