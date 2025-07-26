/**
 * @param {string} content Loader content
 * @returns {string} Processed content
 */
export default function loader(content) {
  this.emitFile("style-2.css", "a { color: coral; }");

  const callback = this.async();

  return callback(null, content);
}
