import path from 'path';

import del from 'del';
import cacache from 'cacache';
import findCacheDir from 'find-cache-dir';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import Webpack4Cache from '../src/Webpack4Cache';
import CssMinimizerPlugin from '../src/index';

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  normalizedSourceMap,
  readAssets,
  removeCache,
} from './helpers';

const uniqueCacheDirectory = findCacheDir({ name: 'unique-cache-directory' });
const uniqueOtherDirectory = findCacheDir({
  name: 'unique-other-cache-directory',
});
const otherCacheDir = findCacheDir({ name: 'other-cache-directory' });
const otherOtherCacheDir = findCacheDir({
  name: 'other-other-cache-directory',
});
const otherOtherOtherCacheDir = findCacheDir({
  name: 'other-other-other-cache-directory',
});

if (getCompiler.isWebpack4()) {
  describe('cache option', () => {
    let compiler;
    let sourceMapCompiler;

    beforeEach(() => {
      compiler = getCompiler({
        entry: {
          one: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
      });

      sourceMapCompiler = getCompiler({
        devtool: 'source-map',
        entry: {
          one: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
        module: {
          rules: [
            {
              test: /.s?css$/i,
              use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
            },
          ],
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].[name].css',
          }),
        ],
      });

      return Promise.all([
        removeCache(),
        removeCache(uniqueCacheDirectory),
        removeCache(uniqueOtherDirectory),
        removeCache(otherCacheDir),
        removeCache(otherOtherCacheDir),
        removeCache(otherOtherOtherCacheDir),
      ]);
    });

    afterAll(() => {
      return Promise.all([
        removeCache(),
        removeCache(uniqueCacheDirectory),
        removeCache(uniqueOtherDirectory),
        removeCache(otherCacheDir),
        removeCache(otherOtherCacheDir),
        removeCache(otherOtherOtherCacheDir),
      ]);
    });

    it('should match snapshot when a value is not specify', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      const getCacheDirectorySpy = jest
        .spyOn(Webpack4Cache, 'getCacheDirectory')
        .mockImplementation(() => uniqueCacheDirectory);

      new CssMinimizerPlugin().apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(readAssets(compiler, stats, '.css'))
        .length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      const newStats = await compile(compiler);

      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(readAssets(compiler, newStats, '.css'))
        .length;

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
      getCacheDirectorySpy.mockRestore();
    });

    it('should match snapshot for the "false" value', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      new CssMinimizerPlugin({ cache: false }).apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      // Cache disabled so we don't run `get` or `put`
      expect(cacacheGetSpy).toHaveBeenCalledTimes(0);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
    });

    it('should match snapshot for the "true" value', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      const getCacheDirectorySpy = jest
        .spyOn(Webpack4Cache, 'getCacheDirectory')
        .mockImplementation(() => {
          return uniqueOtherDirectory;
        });

      new CssMinimizerPlugin({ cache: true }).apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(readAssets(compiler, stats, '.css'))
        .length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      const newStats = await compile(compiler);

      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(readAssets(compiler, newStats, '.css'))
        .length;

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
      getCacheDirectorySpy.mockRestore();
    });

    it('should match snapshot for the "other-cache-directory" value', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      new CssMinimizerPlugin({ cache: otherCacheDir }).apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(readAssets(compiler, stats, '.css'))
        .length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      const newStats = await compile(compiler);

      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(readAssets(compiler, newStats, '.css'))
        .length;

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
    });

    it('should match snapshot when "cacheKey" is custom "function"', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      new CssMinimizerPlugin({
        cache: otherOtherCacheDir,
        cacheKeys: (defaultCacheKeys, file) => {
          // eslint-disable-next-line no-param-reassign
          defaultCacheKeys.myCacheKey = 1;
          // eslint-disable-next-line no-param-reassign
          defaultCacheKeys.myCacheKeyBasedOnFile = `file-${file}`;

          return defaultCacheKeys;
        },
      }).apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(readAssets(compiler, stats, '.css'))
        .length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      const newStats = await compile(compiler);

      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(readAssets(compiler, newStats, '.css'))
        .length;

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
    });

    it('should match snapshot and invalid cache when entry point was renamed', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      const getCacheDirectorySpy = jest
        .spyOn(Webpack4Cache, 'getCacheDirectory')
        .mockImplementation(() => {
          return otherOtherOtherCacheDir;
        });

      new CssMinimizerPlugin({ cache: true }).apply(compiler);

      const stats = await compile(compiler);

      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(readAssets(compiler, stats, '.css'))
        .length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      compiler = getCompiler({
        entry: {
          onne: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
      });

      new CssMinimizerPlugin({ cache: true }).apply(compiler);

      const newStats = await compile(compiler);

      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(readAssets(compiler, newStats, '.css'))
        .length;

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(1);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
      getCacheDirectorySpy.mockRestore();
    });

    it('should match snapshot when sourcemap enable', async () => {
      const cacacheGetSpy = jest.spyOn(cacache, 'get');
      const cacachePutSpy = jest.spyOn(cacache, 'put');

      const getCacheDirectorySpy = jest
        .spyOn(Webpack4Cache, 'getCacheDirectory')
        .mockImplementation(() => uniqueCacheDirectory);

      new CssMinimizerPlugin({ sourceMap: true }).apply(sourceMapCompiler);

      const stats = await compile(sourceMapCompiler);

      expect(readAssets(sourceMapCompiler, stats, '.css')).toMatchSnapshot(
        'assets'
      );
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const countAssets = Object.keys(
        readAssets(sourceMapCompiler, stats, '.css')
      ).length;

      // Try to found cached files, but we don't have their in cache
      expect(cacacheGetSpy).toHaveBeenCalledTimes(countAssets);
      // Put files in cache
      expect(cacachePutSpy).toHaveBeenCalledTimes(countAssets);

      cacache.get.mockClear();
      cacache.put.mockClear();

      const newStats = await compile(sourceMapCompiler);

      expect(readAssets(sourceMapCompiler, newStats, '.css')).toMatchSnapshot(
        'assets'
      );
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      const newCountAssets = Object.keys(
        readAssets(sourceMapCompiler, newStats, '.css')
      ).length;

      const maps = readAssets(sourceMapCompiler, newStats, '.css.map');

      Object.keys(maps).forEach((assetKey) => {
        expect(normalizedSourceMap(maps[assetKey])).toMatchSnapshot(assetKey);
      });

      // Now we have cached files so we get them and don't put new
      expect(cacacheGetSpy).toHaveBeenCalledTimes(newCountAssets);
      expect(cacachePutSpy).toHaveBeenCalledTimes(0);

      cacacheGetSpy.mockRestore();
      cacachePutSpy.mockRestore();
      getCacheDirectorySpy.mockRestore();
    });
  });
} else {
  describe('"cache" option', () => {
    const fileSystemCacheDirectory = path.resolve(
      __dirname,
      './outputs/type-filesystem'
    );

    beforeAll(() => {
      return Promise.all([del(fileSystemCacheDirectory)]);
    });

    it('should work with "false" value for the "cache" option', async () => {
      const compiler = getCompiler({
        entry: {
          one: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
        cache: false,
      });

      new CssMinimizerPlugin().apply(compiler);

      let getCounter = 0;

      compiler.cache.hooks.get.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            getCounter += 1;
          }
        }
      );

      let storeCounter = 0;

      compiler.cache.hooks.store.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            storeCounter += 1;
          }
        }
      );

      const stats = await compile(compiler);

      // Without cache webpack always try to get
      expect(getCounter).toBe(5);
      // Without cache webpack always try to store
      expect(storeCounter).toBe(5);
      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      getCounter = 0;
      storeCounter = 0;

      const newStats = await compile(compiler);

      // Without cache webpack always try to get
      expect(getCounter).toBe(5);
      // Without cache webpack always try to store
      expect(storeCounter).toBe(5);
      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(newStats)).toMatchSnapshot('errors');
      expect(getWarnings(newStats)).toMatchSnapshot('warnings');
    });

    it('should work with "memory" value for the "cache.type" option', async () => {
      const compiler = getCompiler({
        entry: {
          one: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
        cache: {
          type: 'memory',
        },
      });

      new CssMinimizerPlugin().apply(compiler);

      let getCounter = 0;

      compiler.cache.hooks.get.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            getCounter += 1;
          }
        }
      );

      let storeCounter = 0;

      compiler.cache.hooks.store.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            storeCounter += 1;
          }
        }
      );

      const stats = await compile(compiler);

      // Get cache for assets
      expect(getCounter).toBe(5);
      // Store cached assets
      expect(storeCounter).toBe(5);
      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      getCounter = 0;
      storeCounter = 0;

      const newStats = await compile(compiler);

      // Get cache for assets
      expect(getCounter).toBe(5);
      // No need to store, we got cached assets
      expect(storeCounter).toBe(0);
      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(newStats)).toMatchSnapshot('errors');
      expect(getWarnings(newStats)).toMatchSnapshot('warnings');
    });

    it('should work with "filesystem" value for the "cache.type" option', async () => {
      const compiler = getCompiler({
        entry: {
          one: `${__dirname}/fixtures/cache.js`,
          two: `${__dirname}/fixtures/cache-1.js`,
          three: `${__dirname}/fixtures/cache-2.js`,
          four: `${__dirname}/fixtures/cache-3.js`,
          five: `${__dirname}/fixtures/cache-4.js`,
        },
        cache: {
          type: 'filesystem',
          cacheDirectory: fileSystemCacheDirectory,
        },
      });

      new CssMinimizerPlugin().apply(compiler);

      let getCounter = 0;

      compiler.cache.hooks.get.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            getCounter += 1;
          }
        }
      );

      let storeCounter = 0;

      compiler.cache.hooks.store.tap(
        { name: 'TestCache', stage: -100 },
        (identifier) => {
          if (identifier.indexOf('CssMinimizerWebpackPlugin') !== -1) {
            storeCounter += 1;
          }
        }
      );

      const stats = await compile(compiler);

      // Get cache for assets
      expect(getCounter).toBe(5);
      // Store cached assets
      expect(storeCounter).toBe(5);
      expect(readAssets(compiler, stats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(stats)).toMatchSnapshot('errors');
      expect(getWarnings(stats)).toMatchSnapshot('warnings');

      getCounter = 0;
      storeCounter = 0;

      const newStats = await compile(compiler);

      // Get cache for assets
      expect(getCounter).toBe(5);
      // No need to store, we got cached assets
      expect(storeCounter).toBe(0);
      expect(readAssets(compiler, newStats, '.css')).toMatchSnapshot('assets');
      expect(getErrors(newStats)).toMatchSnapshot('errors');
      expect(getWarnings(newStats)).toMatchSnapshot('warnings');
    });
  });
}
