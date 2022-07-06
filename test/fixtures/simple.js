const foo = require("./simple-emit");
const bar = require("./simple-emit-2");
require('./foo.css');

async function load() {
  return require('./simple-async');
}

load();

module.exports = [foo, bar, extracted, css, otherCss];
