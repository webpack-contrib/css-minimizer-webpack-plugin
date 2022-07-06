const CssMinimizerPlugin = require("../src/index");

const {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAssets,
} = require("./helpers");

describe("include option", () => {
  let compiler;

  beforeEach(() => {
    compiler = getCompiler({
      entry: {
        included1: `${__dirname}/fixtures/included1.js`,
        included2: `${__dirname}/fixtures/included2.js`,
        entry: `${__dirname}/fixtures/entry.js`,
      },
    });
  });

  it("should match snapshot for a single RegExp value included1", async () => {
    new CssMinimizerPlugin({
      include: /included1/i,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for a single String value included1", async () => {
    new CssMinimizerPlugin({
      include: "included1",
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for multiple RegExp values included1 and included2", async () => {
    new CssMinimizerPlugin({
      include: [/included1/i, /included2/i],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for multiple String values included1 and included2", async () => {
    new CssMinimizerPlugin({
      include: ["included1", "included2"],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });
});
