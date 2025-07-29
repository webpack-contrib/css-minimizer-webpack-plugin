/**
 * @param {string} content Loader content
 * @returns {string} Processed content
 */
export default function loader(content) {
  this.emitFile("style.css", "a { color: red; }");

  const callback = this.async();

  return callback(null, content);
}
