import {createProjectPlugin} from '@quilted/sewing-kit';
import type {WaterfallHook, ResolvedHooks} from '@quilted/sewing-kit';

import {BabelHooks} from '@quilted/sewing-kit-babel';

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

/**
 * Adds configuration for React to a variety of other build tools.
 */
export function react({
  runtime: defaultRuntime = 'automatic',
  importSource: defaultImportSource = 'react',
}: Options = {}) {
  return createProjectPlugin({
    name: 'SewingKit.React',
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
          '@babel/preset-react',
          {
            runtime,
            importSource: runtime === 'classic' ? undefined : importSource,
            development,
            useBuiltIns: true,
          },
        ]);

        return presets;
      });
    };
  }
}
