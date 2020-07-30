const cssnano = require('cssnano');

const minify = async (options) => {
  const {
    input,
    postcssOptions,
    cssnanoOptions,
    map,
    inputSourceMap,
    minify: minifyFn,
  } = options;

  if (minifyFn) {
    return minifyFn({ input, postcssOptions, cssnanoOptions }, inputSourceMap);
  }

  if (inputSourceMap) {
    postcssOptions.map = { prev: inputSourceMap, ...map };
  }

  const result = await cssnano.process(input, postcssOptions, cssnanoOptions);

  return {
    css: result.css,
    map: result.map,
    error: result.error,
    warnings: result.warnings(),
  };
};

async function transform(options) {
  // 'use strict' => this === undefined (Clean Scope)
  // Safer for possible security issues, albeit not critical at all here
  // eslint-disable-next-line no-new-func, no-param-reassign
  options = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    `'use strict'\nreturn ${options}`
  )(exports, require, module, __filename, __dirname);

  const result = await minify(options);

  return result;
}

module.exports.minify = minify;
module.exports.transform = transform;
