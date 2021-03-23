/* istanbul ignore next */
async function cssnanoMinify(
  data,
  inputSourceMap,
  minimizerOptions = { preset: 'default' }
) {
  const [[name, input]] = Object.entries(data);
  const postcssOptions = {
    to: name,
    from: name,
    ...minimizerOptions.processorOptions,
  };

  if (typeof postcssOptions.parser === 'string') {
    try {
      postcssOptions.parser = await load(postcssOptions.parser);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.parser}" parser failed: ${error.message}\n\n(@${name})`
      );
    }
  }

  if (typeof postcssOptions.stringifier === 'string') {
    try {
      postcssOptions.stringifier = await load(postcssOptions.stringifier);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.stringifier}" stringifier failed: ${error.message}\n\n(@${name})`
      );
    }
  }

  if (typeof postcssOptions.syntax === 'string') {
    try {
      postcssOptions.syntax = await load(postcssOptions.syntax);
    } catch (error) {
      throw new Error(
        `Loading PostCSS "${postcssOptions.syntax}" syntax failed: ${error.message}\n\n(@${name})`
      );
    }
  }

  if (inputSourceMap) {
    postcssOptions.map = {
      annotation: false,
      prev: inputSourceMap,
    };
  }

  // eslint-disable-next-line global-require
  const cssnano = require('cssnano');
  const result = await cssnano.process(input, postcssOptions, minimizerOptions);

  return {
    code: result.css,
    map: result.map && result.map.toString(),
    warnings: result.warnings().map(String),
  };

  async function load(module) {
    let exports;

    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      exports = require(module);

      return exports;
    } catch (requireError) {
      let importESM;

      try {
        // eslint-disable-next-line no-new-func
        importESM = new Function('id', 'return import(id);');
      } catch (e) {
        importESM = null;
      }

      if (requireError.code === 'ERR_REQUIRE_ESM' && importESM) {
        exports = await importESM(module);

        return exports.default;
      }

      throw requireError;
    }
  }
}

// eslint-disable-next-line import/prefer-default-export
export { cssnanoMinify };
