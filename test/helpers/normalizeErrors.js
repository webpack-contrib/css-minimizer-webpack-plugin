function removeCWD(str) {
  const isWin = process.platform === "win32";
  let cwd = process.cwd();
  let normalizedStr = str;

  if (isWin) {
    normalizedStr = normalizedStr.replace(/\\/g, "/");
    cwd = cwd.replace(/\\/g, "/");
  }

  // Normalize file URLs to always use 'file:///'
  normalizedStr = normalizedStr.replace(/file:\/*/g, "file:///");

  return normalizedStr.replace(new RegExp(cwd, "g"), "");
}

export default (errors) =>
  errors.map((error) =>
    removeCWD(error.toString().split("\n").slice(0, 2).join("\n")),
  );
