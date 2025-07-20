import path from "node:path";

import del from "del";

import CssMinimizerPlugin from "../src/index";

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAssets,
} from "./helpers";

describe('"cache" option', () => {
  const fileSystemCacheDirectory = path.resolve(
    __dirname,
    "./outputs/type-filesystem",
  );
  const fileSystemCacheDirectory1 = path.resolve(
    __dirname,
    "./outputs/type-filesystem-1",
  );
  const fileSystemCacheDirectory2 = path.resolve(
    __dirname,
    "./outputs/type-filesystem-2",
  );

  beforeAll(() =>
    Promise.all([
      del(fileSystemCacheDirectory),
      del(fileSystemCacheDirectory1),
      del(fileSystemCacheDirectory2),
    ]),
  );

  it('should work with the "false" value for the "cache" option', async () => {
    const compiler = getCompiler({
      entry: {
        one: path.join(__dirname, "fixtures", "cache.js"),
        two: path.join(__dirname, "fixtures", "cache-1.js"),
        three: path.join(__dirname, "fixtures", "cache-2.js"),
        four: path.join(__dirname, "fixtures", "cache-3.js"),
        five: path.join(__dirname, "fixtures", "cache-4.js"),
      },
      cache: false,
    });

    new CssMinimizerPlugin().apply(compiler);

    let getCounter = 0;

    compiler.cache.hooks.get.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          getCounter += 1;
        }
      },
    );

    let storeCounter = 0;

    compiler.cache.hooks.store.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          storeCounter += 1;
        }
      },
    );

    const stats = await compile(compiler);

    // Without cache webpack always try to get
    expect(getCounter).toBe(5);
    // Without cache webpack always try to store
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    getCounter = 0;
    storeCounter = 0;

    const newStats = await compile(compiler);

    // Without cache webpack always try to get
    expect(getCounter).toBe(5);
    // Without cache webpack always try to store
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");

    await new Promise((resolve) => {
      compiler.close(() => {
        resolve();
      });
    });
  });

  it('should work with the "memory" value for the "cache.type" option', async () => {
    const compiler = getCompiler({
      entry: {
        one: path.join(__dirname, "fixtures", "cache.js"),
        two: path.join(__dirname, "fixtures", "cache-1.js"),
        three: path.join(__dirname, "fixtures", "cache-2.js"),
        four: path.join(__dirname, "fixtures", "cache-3.js"),
        five: path.join(__dirname, "fixtures", "cache-4.js"),
      },
      cache: {
        type: "memory",
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    let getCounter = 0;

    compiler.cache.hooks.get.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          getCounter += 1;
        }
      },
    );

    let storeCounter = 0;

    compiler.cache.hooks.store.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          storeCounter += 1;
        }
      },
    );

    const stats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // Store cached assets
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    getCounter = 0;
    storeCounter = 0;

    const newStats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // No need to store, we got cached assets
    expect(storeCounter).toBe(0);
    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");

    await new Promise((resolve) => {
      compiler.close(() => {
        resolve();
      });
    });
  });

  it('should work with the "filesystem" value for the "cache.type" option', async () => {
    const compiler = getCompiler({
      entry: {
        one: path.join(__dirname, "fixtures", "cache.js"),
        two: path.join(__dirname, "fixtures", "cache-1.js"),
        three: path.join(__dirname, "fixtures", "cache-2.js"),
        four: path.join(__dirname, "fixtures", "cache-3.js"),
        five: path.join(__dirname, "fixtures", "cache-4.js"),
      },
      cache: {
        type: "filesystem",
        cacheDirectory: fileSystemCacheDirectory,
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    let getCounter = 0;

    compiler.cache.hooks.get.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          getCounter += 1;
        }
      },
    );

    let storeCounter = 0;

    compiler.cache.hooks.store.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          storeCounter += 1;
        }
      },
    );

    const stats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // Store cached assets
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    getCounter = 0;
    storeCounter = 0;

    const newStats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // No need to store, we got cached assets
    expect(storeCounter).toBe(0);
    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");

    await new Promise((resolve) => {
      compiler.close(() => {
        resolve();
      });
    });
  });

  it('should work with the "filesystem" value for the "cache.type" option and source maps', async () => {
    const compiler = getCompiler({
      devtool: "source-map",
      entry: {
        one: path.resolve(__dirname, "./fixtures/cache.js"),
        two: path.resolve(__dirname, "./fixtures/cache-1.js"),
        three: path.resolve(__dirname, "./fixtures/cache-2.js"),
        four: path.resolve(__dirname, "./fixtures/cache-3.js"),
        five: path.resolve(__dirname, "./fixtures/cache-4.js"),
      },
      cache: {
        type: "filesystem",
        cacheDirectory: fileSystemCacheDirectory1,
      },
    });

    new CssMinimizerPlugin().apply(compiler);

    let getCounter = 0;

    compiler.cache.hooks.get.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          getCounter += 1;
        }
      },
    );

    let storeCounter = 0;

    compiler.cache.hooks.store.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          storeCounter += 1;
        }
      },
    );

    const stats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // Store cached assets
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, stats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    getCounter = 0;
    storeCounter = 0;

    const newStats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // No need to store, we got cached assets
    expect(storeCounter).toBe(0);
    expect(readAssets(compiler, newStats, /\.css(\.map)?$/)).toMatchSnapshot(
      "assets",
    );
    expect(getErrors(newStats)).toMatchSnapshot("errors");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");

    await new Promise((resolve) => {
      compiler.close(() => {
        resolve();
      });
    });
  });

  it('should work with the "filesystem" value for the "cache.type" option and output warnings', async () => {
    const compiler = getCompiler({
      entry: {
        one: path.resolve(__dirname, "./fixtures/cache.js"),
        two: path.resolve(__dirname, "./fixtures/cache-1.js"),
        three: path.resolve(__dirname, "./fixtures/cache-2.js"),
        four: path.resolve(__dirname, "./fixtures/cache-3.js"),
        five: path.resolve(__dirname, "./fixtures/cache-4.js"),
      },
      cache: {
        type: "filesystem",
        cacheDirectory: fileSystemCacheDirectory2,
      },
    });

    new CssMinimizerPlugin({
      minify: (data) => {
        const postcss = require("postcss");

        const [[fileName, input]] = Object.entries(data);
        const plugin = () => ({
          postcssPlugin: "warning-plugin",
          OnceExit(decl, { result }) {
            result.warn(`Warning from ${result.opts.from}`, {
              plugin: "warning-plugin",
            });
          },
        });

        plugin.postcss = true;

        return postcss([plugin])
          .process(input, { from: fileName, to: fileName })
          .then((result) => ({
            code: result.css,
            map: result.map,
            error: result.error,
            warnings: result.warnings(),
          }));
      },
    }).apply(compiler);

    let getCounter = 0;

    compiler.cache.hooks.get.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          getCounter += 1;
        }
      },
    );

    let storeCounter = 0;

    compiler.cache.hooks.store.tap(
      { name: "TestCache", stage: -100 },
      (identifier) => {
        if (identifier.includes("CssMinimizerWebpackPlugin")) {
          storeCounter += 1;
        }
      },
    );

    const stats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // Store cached assets
    expect(storeCounter).toBe(5);
    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");

    getCounter = 0;
    storeCounter = 0;

    const newStats = await compile(compiler);

    // Get cache for assets
    expect(getCounter).toBe(5);
    // No need to store, we got cached assets
    expect(storeCounter).toBe(0);
    expect(readAssets(compiler, newStats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(newStats)).toMatchSnapshot("errors");
    expect(getWarnings(newStats)).toMatchSnapshot("warnings");

    await new Promise((resolve) => {
      compiler.close(() => {
        resolve();
      });
    });
  });
});
