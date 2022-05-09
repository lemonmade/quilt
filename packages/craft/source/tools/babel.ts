import {createRequire} from 'module';

import type {PluginItem} from '@babel/core';

import {ProjectKind, createProjectPlugin, createWorkspacePlugin} from '../kit';
import type {WaterfallHook} from '../kit';

import type {} from './rollup';

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

  interface BuildWorkspaceConfigurationHooks extends BabelHooks {}
  interface DevelopWorkspaceConfigurationHooks extends BabelHooks {}
  interface TestWorkspaceConfigurationHooks extends BabelHooks {}
}

const require = createRequire(import.meta.url);

/**
 * Adds basic Babel hooks that other plugins can attach configuration to.
 */
export function babelHooks() {
  return createProjectPlugin({
    name: 'Quilt.Babel',
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

/**
 * Adds basic Babel hooks that other plugins can attach configuration to
 * for configuring Babel at the workspace level.
 */
export function babelWorkspaceHooks() {
  return createWorkspacePlugin({
    name: 'Quilt.Babel.Workspace',
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
    name: 'Quilt.Babel.Rollup',
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
            const helpers =
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
                helpers === 'runtime'
                  ? [require.resolve('@babel/plugin-transform-runtime')]
                  : [],
              ),
            ]);

            const finalExtensions = await babelExtensions!.run(baseExtensions);

            return [
              ...plugins,
              babel({
                envName: 'production',
                extensions: finalExtensions,
                exclude: 'node_modules/**',
                babelHelpers: helpers,
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
            const helpers =
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
                helpers === 'runtime'
                  ? [require.resolve('@babel/plugin-transform-runtime')]
                  : [],
              ),
            ]);

            const finalExtensions = await babelExtensions!.run(baseExtensions);

            return [
              ...plugins,
              babel({
                envName: 'production',
                extensions: finalExtensions,
                exclude: 'node_modules/**',
                babelHelpers: helpers,
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
