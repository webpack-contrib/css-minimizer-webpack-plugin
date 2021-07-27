import readAsset from "./readAsset";

export default function readAssets(compiler, stats, extension) {
  const assets = {};

  Object.keys(stats.compilation.assets).forEach((asset) => {
    if (typeof extension === "undefined") {
      assets[asset] = readAsset(asset, compiler, stats);
    } else if (extension.test(asset)) {
      assets[asset] = readAsset(asset, compiler, stats);
    }
  });

  return assets;
}
