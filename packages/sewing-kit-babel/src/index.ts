import type {PluginItem} from '@babel/core';

import {createProjectPlugin, ProjectKind} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';

export interface BabelHooks {
  /**
   * Babel plugins to use for this project.
   */
  babelPlugins: WaterfallHook<PluginItem[]>;

  /**
   * Babel presets to use for this project.
   */
  babelPresets: WaterfallHook<PluginItem[]>;

  /**
   * Babel presets to use for this project.
   */
  babelExtensions: WaterfallHook<string[]>;

  /**
   * A browserslist-compatible set of environment targets
   * to use for in Babel plugins.
   */
  babelTargets: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends BabelHooks {}
  interface DevelopProjectConfigurationHooks extends BabelHooks {}
  interface TestProjectConfigurationHooks extends BabelHooks {}
}

/**
 * Adds basic Babel hooks that other plugins can attach configuration to.
 */
export function babelHooks() {
  return createProjectPlugin({
    name: 'SewingKit.Babel',
    build({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
        babelTargets: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
        babelTargets: waterfall(),
      }));
    },
    test({hooks}) {
      hooks<BabelHooks>(({waterfall}) => ({
        babelPlugins: waterfall(),
        babelPresets: waterfall(),
        babelExtensions: waterfall(),
        babelTargets: waterfall(),
      }));
    },
  });
}

export function babelRollup() {
  return createProjectPlugin({
    name: 'SewingKit.Babel.Rollup',
    build({project, configure}) {
      configure(
        ({
          extensions,
          babelPresets,
          babelPlugins,
          babelTargets,
          babelExtensions,
          rollupPlugins,
        }) => {
          rollupPlugins?.(async (plugins) => {
            const shouldUseRuntime =
              project.kind === ProjectKind.Package ? 'runtime' : 'bundled';

            const [
              {babel},
              targets,
              baseExtensions,
              babelPresetsOption,
              babelPluginsOption,
            ] = await Promise.all([
              import('@rollup/plugin-babel'),
              babelTargets!.run([]),
              extensions.run(['.mjs', '.cjs', '.js']),
              babelPresets!.run([]),
              babelPlugins!.run(
                shouldUseRuntime ? ['@babel/plugin-transform-runtime'] : [],
              ),
            ]);

            const finalExtensions = await babelExtensions!.run(baseExtensions);

            return [
              ...plugins,
              babel({
                envName: 'production',
                extensions: finalExtensions,
                exclude: 'node_modules/**',
                babelHelpers: shouldUseRuntime ? 'runtime' : 'bundled',
                configFile: false,
                babelrc: false,
                skipPreflightCheck: true,
                // @ts-expect-error Babel types have not been updated yet
                targets,
                presets: babelPresetsOption,
                plugins: babelPluginsOption,
              }),
            ];
          });
        },
      );
    },
    develop({project, configure}) {
      configure(
        ({
          extensions,
          babelPresets,
          babelPlugins,
          babelTargets,
          babelExtensions,
          rollupPlugins,
        }) => {
          rollupPlugins?.(async (plugins) => {
            const shouldUseRuntime =
              project.kind === ProjectKind.Package ? 'runtime' : 'bundled';

            const [
              {babel},
              targets,
              baseExtensions,
              babelPresetsOption,
              babelPluginsOption,
            ] = await Promise.all([
              import('@rollup/plugin-babel'),
              babelTargets!.run([]),
              extensions.run(['.mjs', '.cjs', '.js']),
              babelPresets!.run([]),
              babelPlugins!.run(
                shouldUseRuntime ? ['@babel/plugin-transform-runtime'] : [],
              ),
            ]);

            const finalExtensions = await babelExtensions!.run(baseExtensions);

            return [
              ...plugins,
              babel({
                envName: 'production',
                extensions: finalExtensions,
                exclude: 'node_modules/**',
                babelHelpers: shouldUseRuntime ? 'runtime' : 'bundled',
                configFile: false,
                babelrc: false,
                skipPreflightCheck: true,
                // @ts-expect-error Babel types have not been updated yet
                targets,
                presets: babelPresetsOption,
                plugins: babelPluginsOption,
              }),
            ];
          });
        },
      );
    },
  });
}
