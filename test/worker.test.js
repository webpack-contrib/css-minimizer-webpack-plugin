import serialize from "serialize-javascript";

import { transform } from "../src/minify";

import CssMinimizerPlugin from "../src";

import { normalizeErrors } from "./helpers";

describe("worker", () => {
  it("should minify css", async () => {
    const options = {
      name: "entry.css",
      input: ".foo{color:red;}\n.bar{color:coral;}",
      inputSourceMap: {
        version: 3,
        sources: ["foo.css", "bar.css"],
        names: [],
        mappings: "AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO",
        file: "x",
        sourcesContent: [".foo{color:red;}", ".bar{color:coral;}"],
      },
      minimizerOptions: { discardComments: false },
      minify: CssMinimizerPlugin.cssnanoMinify,
    };
    const result = await transform(serialize(options));

    expect(result).toMatchSnapshot("result");
  });

  it("should work inputSourceMap as prev", async () => {
    const options = {
      name: "entry.css",
      input: ".foo{color:red;}\n.bar{color:coral;}",
      minimizerOptions: { discardComments: false },
      inputSourceMap: {
        version: 3,
        sources: ["foo.css", "bar.css"],
        names: [],
        mappings: "AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO",
        file: "x",
        sourcesContent: [".foo{color:red;}", ".bar{color:coral;}"],
      },
      minify: CssMinimizerPlugin.cssnanoMinify,
    };
    const result = await transform(serialize(options));

    expect(result).toMatchSnapshot("result");
  });

  it("should work options.minify function", async () => {
    const options = {
      name: "entry.css",
      input: ".foo{color:red;}\n.bar{color:coral;}",
      minimizerOptions: { discardComments: false },
      minify: () => {
        return { code: ".minify {};" };
      },
    };
    const result = await transform(serialize(options));

    expect(result).toMatchSnapshot("result");
  });

  it("should emit error", async () => {
    const options = {
      name: "entry.css",
      input: false,
      minimizerOptions: { preset: "default" },
      minify: CssMinimizerPlugin.cssnanoMinify,
    };

    try {
      await transform(serialize(options));
    } catch (error) {
      const normalizeError = { ...error };

      normalizeError.message = [error.message.split("\n")];

      expect(normalizeErrors(normalizeError.message)).toMatchSnapshot("error");
    }
  });
});
