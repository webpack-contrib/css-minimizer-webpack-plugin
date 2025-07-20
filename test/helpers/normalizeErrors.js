/**
 * @param {string} str String to process
 * @returns {string} - Processed string
 */
function removeCWD(str) {
  const isWin = process.platform === "win32";
  let cwd = process.cwd();

  if (isWin) {
    str = str.replaceAll("\\", "/");

    cwd = cwd.replaceAll("\\", "/");
  }

  return str.replaceAll(new RegExp(cwd, "g"), "");
}

/**
 * @param {Array<Error>} errors Array of errors
 * @returns {Array<string>} - Normalized error messages
 */
export default (errors) =>
  errors.map((error) =>
    removeCWD(error.toString().split("\n").slice(0, 2).join("\n")),
  );
