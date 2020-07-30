import serialize from 'serialize-javascript';

import { transform } from '../src/minify';

import { normalizeErrors } from './helpers';

describe('worker', () => {
  it('should minify css', async () => {
    const options = {
      input: '.foo{color:red;}\n.bar{color:coral;}',
      postcssOptions: {
        from: 'entry.css',
        to: 'entry.css',
        map: {
          prev: {
            version: 3,
            sources: ['foo.css', 'bar.css'],
            names: [],
            mappings: 'AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO',
            file: 'x',
            sourcesContent: ['.foo{color:red;}', '.bar{color:coral;}'],
          },
          inline: false,
        },
      },
      cssnanoOptions: { discardComments: false },
    };
    const { css, map } = await transform(serialize(options));

    expect(css).toMatchSnapshot('css');
    expect(map).toMatchSnapshot('map');
  });

  it('should work inputSourceMap as prev', async () => {
    const options = {
      input: '.foo{color:red;}\n.bar{color:coral;}',
      postcssOptions: {
        from: 'entry.css',
        to: 'entry.css',
        map: {
          prev: {
            version: 3,
            sources: ['foo.css', 'bar.css'],
            names: [],
            mappings: 'AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO',
            file: 'x',
            sourcesContent: ['.foo{color:red;}', '.bar{color:coral;}'],
          },
          inline: false,
        },
      },
      cssnanoOptions: { discardComments: false },
      inputSourceMap: {
        version: 3,
        sources: ['foo.css', 'bar.css'],
        names: [],
        mappings: 'AAAA,KAAK,iBAAiB,KAAK,UAAU,OAAO',
        file: 'x',
        sourcesContent: ['.foo{color:red;}', '.bar{color:coral;}'],
      },
    };
    const { css, map } = await transform(serialize(options));

    expect(css).toMatchSnapshot('css');
    expect(map).toMatchSnapshot('map');
  });

  it('should work options.minify function', async () => {
    const options = {
      input: '.foo{color:red;}\n.bar{color:coral;}',
      postcssOptions: {
        from: 'entry.css',
        to: 'entry.css',
      },
      cssnanoOptions: { discardComments: false },
      minify: () => {
        return { css: '.minify {};' };
      },
    };
    const { css, map } = await transform(serialize(options));

    expect(css).toMatchSnapshot('css');
    expect(map).toMatchSnapshot('map');
  });

  it('should emit error', async () => {
    const options = {
      input: false,
      postcssOptions: {
        from: 'entry.css',
        to: 'entry.css',
      },
    };

    try {
      await transform(serialize(options));
    } catch (error) {
      const normalizeError = { ...error };

      normalizeError.message = [error.message.split('\n')];

      expect(normalizeErrors(normalizeError.message)).toMatchSnapshot('error');
    }
  });

  it('should emit minimizer error', async () => {
    const options = {
      input: false,
      postcssOptions: {
        from: 'entry.css',
        to: 'entry.css',
      },
      minify: () => {
        return { error: new Error('cssnano error') };
      },
    };

    try {
      await transform(serialize(options));
    } catch (error) {
      const normalizeError = { ...error };

      normalizeError.message = [error.message.split('\n')];

      expect(normalizeErrors(normalizeError.message)).toMatchSnapshot('error');
    }
  });
});
