import {createRequire} from 'module';
import type {PolyfillFeature} from '@quilted/polyfills';

import {createProjectPlugin, Runtime} from '../kit';
import type {
  WaterfallHookWithDefault,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit';

import type {} from '../tools/jest';
import type {} from '../tools/rollup';
import type {} from './targets';

export type {PolyfillFeature};

export interface PolyfillHooks {
  /**
   * The additional polyfills to include for this project.
   */
  quiltPolyfillFeatures: WaterfallHookWithDefault<PolyfillFeature[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends PolyfillHooks {}
  interface DevelopProjectConfigurationHooks extends PolyfillHooks {}
  interface TestProjectConfigurationHooks extends PolyfillHooks {}
}

export interface Options {
  /**
   * The features you’d like to polyfill.
   */
  features?: PolyfillFeature[];

  /**
   * The base package name used for resolving polyfill imports. Defaults
   * to `@quilted/polyfills`.
   */
  package?: string;
}

const ALIAS_DEPENDENCIES = ['core-js', 'regenerator-runtime'];

const require = createRequire(import.meta.url);

export function polyfills({features, package: packageName}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Polyfills',
    build({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(addRollupConfiguration);
    },
    develop({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(addRollupConfiguration);
    },
    test({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(({jestModuleMapper, quiltPolyfillFeatures}) => {
        jestModuleMapper?.(async (moduleMappings) => {
          const [{polyfillAliasesForTarget}, resolvedFeatures] =
            await Promise.all([
              import('@quilted/polyfills'),
              quiltPolyfillFeatures!.run(),
            ]);

          const mappedPolyfills = polyfillAliasesForTarget('node', {
            package: packageName,
            features: resolvedFeatures,
            polyfill: 'usage',
          });

          for (const [polyfill, mappedPolyfill] of Object.entries(
            mappedPolyfills,
          )) {
            if (!mappedPolyfill) continue;
            moduleMappings[`${packageName}/${polyfill}$`] = mappedPolyfill;
          }

          return moduleMappings;
        });
      });
    },
  });

  function addRollupConfiguration({
    runtime,
    targets,
    rollupPlugins,
    quiltPolyfillFeatures,
  }:
    | ResolvedBuildProjectConfigurationHooks
    | ResolvedDevelopProjectConfigurationHooks) {
    rollupPlugins?.(async (plugins) => {
      const [
        {packageDirectory},
        {default: alias},
        {polyfill},
        resolvedFeatures,
        resolvedRuntime,
      ] = await Promise.all([
        import('pkg-dir'),
        import('@rollup/plugin-alias'),
        import('@quilted/polyfills/rollup'),
        quiltPolyfillFeatures!.run(),
        runtime.run(),
      ]);

      const aliases = await Promise.all(
        ALIAS_DEPENDENCIES.map(async (dependency) => {
          const dependencyRoot = await packageDirectory({
            cwd: require.resolve(dependency),
          });

          return [dependency, dependencyRoot] as const;
        }),
      );

      return [
        alias({
          entries: Object.fromEntries(aliases),
        }),
        polyfill({
          package: packageName,
          features: resolvedFeatures,
          target: resolvedRuntime.includes(Runtime.Browser)
            ? await targets?.run([])
            : 'node',
        }),
        ...plugins,
      ];
    });
  }
}
