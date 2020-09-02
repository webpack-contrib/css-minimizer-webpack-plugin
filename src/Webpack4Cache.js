import os from 'os';

import cacache from 'cacache';
import findCacheDir from 'find-cache-dir';
import serialize from 'serialize-javascript';

export default class Webpack4Cache {
  constructor(compilation, options, weakCache) {
    this.cache =
      options.cache === true
        ? Webpack4Cache.getCacheDirectory()
        : options.cache;
    this.weakCache = weakCache;
  }

  static getCacheDirectory() {
    return (
      findCacheDir({ name: 'css-minimizer-webpack-plugin' }) || os.tmpdir()
    );
  }

  async get(cacheData, sources) {
    const weakOutput = this.weakCache.get(cacheData.assetSource);

    if (weakOutput) {
      return weakOutput;
    }

    if (!this.cache) {
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    // eslint-disable-next-line no-param-reassign
    cacheData.cacheIdent =
      cacheData.cacheIdent || serialize(cacheData.cacheKeys);

    let cachedResult;

    try {
      cachedResult = await cacache.get(this.cache, cacheData.cacheIdent);
    } catch (ignoreError) {
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    cachedResult = JSON.parse(cachedResult.data);

    const { css, map, input, assetName, inputSourceMap } = cachedResult;

    if (map) {
      cachedResult.source = new sources.SourceMapSource(
        css,
        assetName,
        map,
        input,
        inputSourceMap,
        true
      );
    } else {
      cachedResult.source = new sources.RawSource(css);
    }

    return cachedResult;
  }

  async store(cacheData) {
    if (!this.weakCache.has(cacheData.assetSource)) {
      this.weakCache.set(cacheData.assetSource, cacheData);
    }

    if (!this.cache) {
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    const {
      cacheIdent,
      css,
      assetName,
      map,
      input,
      inputSourceMap,
    } = cacheData;

    return cacache.put(
      this.cache,
      cacheIdent,
      JSON.stringify({
        assetName,
        css,
        map,
        input,
        inputSourceMap,
      })
    );
  }
}
