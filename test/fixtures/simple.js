import * as foo from './simple-emit';
import * as bar from './simple-emit-2';
import * as extracted from './foo.css';

async function load() {
  return import('./simple-async');
}

load();

export default [foo, bar, extracted, css, otherCss];
