import {createRequire} from 'module';

import {
  createProjectPlugin,
  type WaterfallHookWithDefault,
  type ResolvedHooks,
} from '../kit.ts';

import type {BabelHooks} from '../tools/babel.ts';
import {addRollupOnWarn, type RollupHooks} from '../tools/rollup.ts';

// TODO
export interface ReactHooks {
  reactRuntime: WaterfallHookWithDefault<'automatic' | 'classic'>;
  reactImportSource: WaterfallHookWithDefault<string>;
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
        reactRuntime: waterfall({
          default: defaultRuntime,
        }),
        reactImportSource: waterfall({
          default: defaultImportSource,
        }),
      }));

      configure(addConfiguration({development: false}));
    },
    develop({hooks, configure}) {
      hooks<ReactHooks>(({waterfall}) => ({
        reactRuntime: waterfall({
          default: defaultRuntime,
        }),
        reactImportSource: waterfall({
          default: defaultImportSource,
        }),
      }));

      configure(addConfiguration({development: true}));
    },
    test({hooks, configure}) {
      hooks<ReactHooks>(({waterfall}) => ({
        reactRuntime: waterfall({
          default: defaultRuntime,
        }),
        reactImportSource: waterfall({
          default: defaultImportSource,
        }),
      }));

      configure(addConfiguration({development: true}));
    },
  });

  function addConfiguration({development = false} = {}) {
    return ({
      babelPresets,
      rollupInputOptions,
      reactRuntime,
      reactImportSource,
    }: ResolvedHooks<BabelHooks & RollupHooks & ReactHooks>) => {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      rollupInputOptions?.((options) =>
        addRollupOnWarn(options, (warning, defaultWarn) => {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            /['"]use client['"]/.test(warning.message)
          ) {
            return;
          }

          defaultWarn(warning);
        }),
      );

      babelPresets?.(async (presets) => {
        const [runtime, importSource] = await Promise.all([
          reactRuntime!.run(),
          reactImportSource!.run(),
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
