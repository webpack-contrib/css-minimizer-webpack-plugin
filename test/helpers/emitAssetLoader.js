module.exports = function loader(content) {
  this.emitFile("style.css", "a { color: red; }");

  const callback = this.async();

  return callback(null, content);
};
