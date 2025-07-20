/**
 * @param {import("webpack").Compiler} compiler Webpack compiler
 * @returns {Promise<import("webpack").Stats>} - Promise with webpack stats
 */
export default function compile(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err);
      return resolve(stats);
    });
  });
}
