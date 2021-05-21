import {transformAsync} from '@babel/core';

import asyncBabelPlugin, {Options} from '../babel-plugin';

const defaultPackage = 'some-async-package';
const defaultImport = 'createAsyncComponent';
const defaultOptions = {packages: {[defaultPackage]: [defaultImport]}};

describe('asyncBabelPlugin()', () => {
  it('does nothing to an unrelated function call', async () => {
    const code = await normalize(`
      import {${defaultImport}} from 'unrelated-package';

      ${defaultImport}({
        load: () => import('./Foo'),
      });
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if there are no arguments', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}();
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if the first argument is not an object', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}(() => import('./Foo'));
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if the first argument does not have a load prop', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}({
        ...otherOptions,
        [complexExpression()]: value,
        'non-identifier': () => import('./Bar'),
        notLoad: () => import('./Foo'),
      });
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if the load prop is not a function', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}({
        ...otherOptions,
        load: Foo,
      });
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not process a function that has a scoped binding with the same name as the import', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      {
        const ${defaultImport} = UNRELATED_FUNCTION;

        ${defaultImport}({
          load: () => import('./Foo'),
        });
      }
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if one exists', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}({
        id: () => './Foo',
        load: () => import('./Foo'),
      });
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not add an id prop if no dynamic imports exist', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      ${defaultImport}({
        load: () => Foo,
      });
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  it('does not process the binding if it is not a call expression', async () => {
    const code = await normalize(`
      import {${defaultImport}} from '${defaultPackage}';

      export {${defaultImport}};
    `);

    expect(await transform(code, defaultOptions)).toBe(code);
  });

  describe('moduleSystem', () => {
    describe('commonjs', () => {
      it('generates the synchronous import fields', async () => {
        const code = await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: () => import('./Foo'),
          });
        `);

        expect(await transform(code, defaultOptions)).toBe(
          await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
        );
      });

      it('generates the synchronous import fields when load is a method', async () => {
        const code = await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load() { return import('./Foo'); },
          });
        `);

        expect(await transform(code, defaultOptions)).toBe(
          await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load() { return import('./Foo'); },
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
        );
      });

      it('generates the synchronous import fields when load is a function declaration', async () => {
        const code = await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: function load() { return import('./Foo'); },
          });
        `);

        expect(await transform(code, defaultOptions)).toBe(
          await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: function load() { return import('./Foo'); },
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
        );
      });
    });

    describe('systemjs', () => {
      it('generates the synchronous import fields', async () => {
        const code = await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: () => import('./Foo'),
          });
        `);

        expect(
          await transform(code, {...defaultOptions, moduleSystem: 'systemjs'}),
        ).toBe(
          await normalize(`
            import {${defaultImport}} from '${defaultPackage}';
      
            ${defaultImport}({
              load: () => import('./Foo'),
              get: () => System.get('./Foo'),
              id: () => './Foo',
            });
          `),
        );
      });
    });

    describe('webpack', () => {
      it('generates the synchronous import fields', async () => {
        const code = await normalize(`
          import {${defaultImport}} from '${defaultPackage}';
    
          ${defaultImport}({
            load: () => import('./Foo'),
          });
        `);

        expect(
          await transform(code, {...defaultOptions, moduleSystem: 'webpack'}),
        ).toBe(
          await normalize(`
            import {${defaultImport}} from '${defaultPackage}';
      
            ${defaultImport}({
              load: () => import('./Foo'),
              get: () => __webpack_require__('./Foo'),
              id: () => require.resolveWeak('./Foo'),
            });
          `),
        );
      });
    });
  });

  describe('packages', () => {
    it('processes createResolver from @quilted/async by default', async () => {
      const code = await normalize(`
        import {createResolver} from '@quilted/async';

        createResolver({
          load: () => import('./Foo'),
        });
      `);

      expect(await transform(code)).toBe(
        await normalize(`
          import {createResolver} from '@quilted/async';

          createResolver({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
      );
    });

    it('processes createResolver from @quilted/react-async by default', async () => {
      const code = await normalize(`
        import {createResolver} from '@quilted/react-async';

        createResolver({
          load: () => import('./Foo'),
        });
      `);

      expect(await transform(code)).toBe(
        await normalize(`
          import {createResolver} from '@quilted/react-async';

          createResolver({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
      );
    });

    it('processes createAsyncComponent from @quilted/react-async by default', async () => {
      const code = await normalize(`
        import {createAsyncComponent} from '@quilted/react-async';

        createAsyncComponent({
          load: () => import('./Foo'),
        });
      `);

      expect(await transform(code)).toBe(
        await normalize(`
          import {createAsyncComponent} from '@quilted/react-async';

          createAsyncComponent({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
      );
    });

    it('processes createResolver from @quilted/quilt by default', async () => {
      const code = await normalize(`
        import {createResolver} from '@quilted/quilt';

        createResolver({
          load: () => import('./Foo'),
        });
      `);

      expect(await transform(code)).toBe(
        await normalize(`
          import {createResolver} from '@quilted/quilt';

          createResolver({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
      );
    });

    it('processes createAsyncComponent from @quilted/quilt by default', async () => {
      const code = await normalize(`
        import {createAsyncComponent} from '@quilted/quilt';

        createAsyncComponent({
          load: () => import('./Foo'),
        });
      `);

      expect(await transform(code)).toBe(
        await normalize(`
          import {createAsyncComponent} from '@quilted/quilt';

          createAsyncComponent({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });
        `),
      );
    });

    it('processes other specified imports', async () => {
      const code = await normalize(`
        import {createAsync, createAsyncButNoProcess} from 'async-package';

        createAsync({
          load: () => import('./Foo'),
        });

        createAsyncButNoProcess({
          load: () => import('./Foo'),
        });
      `);

      const packages = {
        'async-package': ['createAsync'],
      };

      expect(await transform(code, {packages})).toBe(
        await normalize(`
          import {createAsync, createAsyncButNoProcess} from 'async-package';

          createAsync({
            load: () => import('./Foo'),
            get: () => require('./Foo'),
            id: () => './Foo',
          });

          createAsyncButNoProcess({
            load: () => import('./Foo'),
          });
        `),
      );
    });
  });
});

async function normalize(code: string) {
  const result = await transformAsync(code, {
    plugins: [require('@babel/plugin-syntax-dynamic-import')],
    configFile: false,
  });

  return (result && result.code) || '';
}

async function transform(code: string, options: Partial<Options> = {}) {
  const result = await transformAsync(code, {
    plugins: [
      require('@babel/plugin-syntax-dynamic-import'),
      [asyncBabelPlugin, options],
    ],
    configFile: false,
  });

  return (result && result.code) || '';
}
