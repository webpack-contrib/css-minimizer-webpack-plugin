const CssMinimizerPlugin = require("../src/index");

const {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAssets,
} = require("./helpers");

describe("exclude option", () => {
  let compiler;

  beforeEach(() => {
    compiler = getCompiler({
      entry: {
        excluded1: `${__dirname}/fixtures/excluded1.js`,
        excluded2: `${__dirname}/fixtures/excluded2.js`,
        entry: `${__dirname}/fixtures/entry.js`,
      },
    });
  });

  it("should match snapshot for a single RegExp value excluded1", async () => {
    new CssMinimizerPlugin({
      exclude: /excluded1/i,
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for a single String value excluded1", async () => {
    new CssMinimizerPlugin({
      exclude: "excluded1",
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for multiple RegExp values excluded1 and excluded2", async () => {
    new CssMinimizerPlugin({
      exclude: [/excluded1/i, /excluded2/i],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });

  it("should match snapshot for multiple String values excluded1 and excluded2", async () => {
    new CssMinimizerPlugin({
      exclude: ["excluded1", "excluded2"],
    }).apply(compiler);

    const stats = await compile(compiler);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot("assets");
    expect(getErrors(stats)).toMatchSnapshot("errors");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
  });
});
