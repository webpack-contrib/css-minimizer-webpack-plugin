import foo from './simple-emit';
import bar from './simple-emit-2';
import './foo.css';

async function load() {
  return import('./simple-async');
}

load();

export default [foo, bar, extracted, css, otherCss];
