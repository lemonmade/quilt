import {createRequire} from 'module';
import type {PolyfillFeature} from '@quilted/polyfills';

import {createProjectPlugin, Runtime} from '../kit';
import type {
  WaterfallHook,
  WaterfallHookWithDefault,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit';

import {addRollupOnWarn} from '../tools/rollup';
import type {} from '../tools/jest';
import type {} from './targets';

export type {PolyfillFeature};

export interface PolyfillHooks {
  /**
   * The additional polyfills to include for this project.
   */
  quiltPolyfillFeatures: WaterfallHookWithDefault<PolyfillFeature[]>;

  /**
   * Features that actually need to be polyfilled for the runtime environment
   * of this project.
   */
  quiltPolyfillFeaturesForEnvironment: WaterfallHook<PolyfillFeature[]>;
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
        quiltPolyfillFeaturesForEnvironment: waterfall(),
      }));

      configure(addConfiguration);
    },
    develop({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
        quiltPolyfillFeaturesForEnvironment: waterfall(),
      }));

      configure(addConfiguration);
    },
    test({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
        quiltPolyfillFeaturesForEnvironment: waterfall(),
      }));

      configure(
        ({
          jestModuleMapper,
          quiltPolyfillFeatures,
          quiltPolyfillFeaturesForEnvironment,
        }) => {
          jestModuleMapper?.(async (moduleMappings) => {
            const [{polyfillAliasesForTarget}, allNecessaryFeatures] =
              await Promise.all([
                import('@quilted/polyfills'),
                quiltPolyfillFeatures!.run(),
              ]);

            const featuresNeedingPolyfills =
              await quiltPolyfillFeaturesForEnvironment!.run(
                allNecessaryFeatures,
              );

            const mappedPolyfills = polyfillAliasesForTarget('node', {
              package: packageName,
              features: featuresNeedingPolyfills,
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
        },
      );
    },
  });

  function addConfiguration({
    runtime,
    targets,
    rollupPlugins,
    rollupInputOptions,
    quiltPolyfillFeatures,
    quiltPolyfillFeaturesForEnvironment,
  }:
    | ResolvedBuildProjectConfigurationHooks
    | ResolvedDevelopProjectConfigurationHooks) {
    // Disable circular import warnings for core-js, because they are not actually
    // issues.
    // @see https://github.com/rollup/rollup/issues/2271
    rollupInputOptions?.((options) =>
      addRollupOnWarn(options, (warning, defaultWarn) => {
        if (
          warning.code === 'CIRCULAR_DEPENDENCY' &&
          (warning.importer?.includes('node_modules/core-js') ?? false)
        ) {
          return;
        }

        defaultWarn(warning);
      }),
    );

    rollupPlugins?.(async (plugins) => {
      const [
        {packageDirectory},
        {default: alias},
        {polyfill},
        allNecessaryFeatures,
        resolvedRuntime,
      ] = await Promise.all([
        import('pkg-dir'),
        import('@rollup/plugin-alias'),
        import('@quilted/polyfills/rollup'),
        quiltPolyfillFeatures!.run(),
        runtime.run(),
      ]);

      const featuresNeedingPolyfills =
        await quiltPolyfillFeaturesForEnvironment!.run(allNecessaryFeatures);

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
          features: featuresNeedingPolyfills,
          target: resolvedRuntime.includes(Runtime.Browser)
            ? await targets?.run([])
            : 'node',
        }),
        ...plugins,
      ];
    });
  }
}
