import foo from './simple-emit';
import bar from './simple-emit-2';
import extracted from './foo.css';

async function load() {
  return import('./simple-async');
}

load();

export default [foo, bar, extracted, css, otherCss];
