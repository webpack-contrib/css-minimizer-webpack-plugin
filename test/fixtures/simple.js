import foo from './simple-emit';

async function load() {
  return import('./simple-async');
}

load();

export default [foo, css, otherCss];
