/*
 * We bring to the line here, because when passing result from the worker,
 * the warning.toString is replaced with native Object.toString
 * */
function warningsToString(warnings) {
  return warnings.map((i) => i.toString());
}

const minify = async (options) => {
  const {
    name,
    input,
    minimizerOptions,
    inputSourceMap,
    minify: minifyFn,
  } = options;

  const result = await minifyFn(
    { [name]: input },
    inputSourceMap,
    minimizerOptions
  );

  return {
    code: result.code,
    map: result.map,
    warnings: warningsToString(result.warnings || []),
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
