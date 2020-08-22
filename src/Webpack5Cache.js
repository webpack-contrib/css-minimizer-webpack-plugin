export default class Cache {
  // eslint-disable-next-line no-unused-vars
  constructor(compilation) {
    this.cache = compilation.getCache('CssMinimizerWebpackPlugin');
  }

  async get(task) {
    // eslint-disable-next-line no-param-reassign
    task.eTag = task.eTag || this.cache.getLazyHashedEtag(task.assetSource);

    return this.cache.getPromise(task.assetName, task.eTag);
  }

  async store(task) {
    return this.cache.storePromise(task.assetName, task.eTag, task.output);
  }
}
