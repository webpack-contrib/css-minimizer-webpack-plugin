const cssnano = require('cssnano');

const minify = (options) => {
  const { input, postcssOptions, cssnanoOptions } = options;

  return cssnano.process(input, postcssOptions, cssnanoOptions);
};

function transform(options) {
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

  const result = minify(options);

  if (result.error) {
    throw result.error;
  } else {
    return result;
  }
}

module.exports.minify = minify;
module.exports.transform = transform;
