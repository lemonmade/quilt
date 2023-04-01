import {createRequire} from 'module';

import {
  createProjectPlugin,
  type WaterfallHook,
  type ResolvedHooks,
} from '../kit.ts';

import type {BabelHooks} from '../tools/babel.ts';

// TODO
export interface ReactHooks {
  reactRuntime: WaterfallHook<'automatic' | 'classic'>;
  reactImportSource: WaterfallHook<string>;
}

export interface Options {
  /**
   * The React runtime transformation to use. By default, the `automatic`
   * runtime is used, which requires a relatively-modern version of React.
   */
  runtime?: 'automatic' | 'classic';

  /**
   * The source to import from for JSX transforms. By default, `react` is
   * used. You may want to use this option if you are aliasing `react` to
   * `preact` or another React-compatible library.
   */
  importSource?: string;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends ReactHooks {}
  interface DevelopProjectConfigurationHooks extends ReactHooks {}
  interface TestProjectConfigurationHooks extends ReactHooks {}
}

const require = createRequire(import.meta.url);

/**
 * Adds configuration for React to a variety of other build tools.
 */
export function react({
  runtime: defaultRuntime = 'automatic',
  importSource: defaultImportSource = 'react',
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.React',
    build({hooks, configure}) {
      hooks<ReactHooks>(({waterfall}) => ({
        reactRuntime: waterfall(),
        reactImportSource: waterfall(),
      }));

      configure(addConfiguration({development: false}));
    },
    develop({hooks, configure}) {
      hooks<ReactHooks>(({waterfall}) => ({
        reactRuntime: waterfall(),
        reactImportSource: waterfall(),
      }));

      configure(addConfiguration({development: true}));
    },
    test({hooks, configure}) {
      hooks<ReactHooks>(({waterfall}) => ({
        reactRuntime: waterfall(),
        reactImportSource: waterfall(),
      }));

      configure(addConfiguration({development: true}));
    },
  });

  function addConfiguration({development = false} = {}) {
    return ({
      babelPresets,
      reactRuntime,
      reactImportSource,
    }: ResolvedHooks<BabelHooks & ReactHooks>) => {
      babelPresets?.(async (presets) => {
        const [runtime, importSource] = await Promise.all([
          reactRuntime!.run(defaultRuntime),
          reactImportSource!.run(defaultImportSource),
        ]);

        presets.push([
          require.resolve('@babel/preset-react'),
          runtime === 'automatic'
            ? {
                runtime,
                importSource,
                development,
              }
            : {
                runtime,
                development,
                useBuiltIns: true,
              },
        ]);

        return presets;
      });
    };
  }
}
