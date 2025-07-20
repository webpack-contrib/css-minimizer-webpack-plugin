import readAsset from "./readAsset";

/**
 * @param {import("webpack").Compiler} compiler Webpack compiler
 * @param {import("webpack").Stats} stats Webpack stats
 * @param {RegExp=} extension File extension filter
 * @returns {Record<string, string>} - Assets map
 */
export default function readAssets(compiler, stats, extension) {
  const assets = {};

  for (const asset of Object.keys(stats.compilation.assets)) {
    if (typeof extension === "undefined") {
      assets[asset] = readAsset(asset, compiler, stats);
    } else if (extension.test(asset)) {
      assets[asset] = readAsset(asset, compiler, stats);
    }
  }

  return assets;
}
