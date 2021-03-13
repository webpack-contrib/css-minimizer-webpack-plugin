const cssnano = require('cssnano');
/*
 * We bring to the line here, because when passing result from the worker,
 * the warning.toString is replaced with native Object.toString
 * */
function warningsToString(warnings) {
  return warnings.map((i) => i.toString());
}

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

const minify = async (options) => {
  const {
    name,
    input,
    minimizerOptions,
    inputSourceMap,
    minify: minifyFn,
  } = options;

  if (minifyFn) {
    const result = await minifyFn(
      { [name]: input },
      inputSourceMap,
      minimizerOptions
    );

    return {
      // TODO remove `css` in future major release
      code: result.code || result.css,
      map: result.map,
      warnings: warningsToString(result.warnings || []),
    };
  }

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

  const result = await cssnano.process(input, postcssOptions, minimizerOptions);

  return {
    code: result.css,
    map: result.map && result.map.toString(),
    warnings: warningsToString(result.warnings()),
  };
};

async function transform(options) {
  // 'use strict' => this === undefined (Clean Scope)
  // Safer for possible security issues, albeit not critical at all here
  // eslint-disable-next-line no-new-func, no-param-reassign
  const evaluatedOptions = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    `'use strict'\nreturn ${options}`
  )(exports, require, module, __filename, __dirname);

  const result = await minify(evaluatedOptions);

  if (result.error) {
    throw result.error;
  } else {
    return result;
  }
}

module.exports.minify = minify;
module.exports.transform = transform;
