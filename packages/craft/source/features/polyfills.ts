import {createRequire} from 'module';
import type {Plugin as RollupPlugin} from 'rollup';
import type {PolyfillFeature} from '@quilted/polyfills';

import {createProjectPlugin} from '../kit';
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
              moduleMappings[`^${packageName}/${polyfill}$`] = mappedPolyfill;
            }

            return moduleMappings;
          });
        },
      );
    },
  });

  function addConfiguration({
    browserslistTargets,
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
          (warning.exporter?.includes('node_modules/core-js') ?? false)
        ) {
          return;
        }

        defaultWarn(warning);
      }),
    );

    rollupPlugins?.(async (plugins) => {
      const [{packageDirectory}, {default: alias}, allNecessaryFeatures] =
        await Promise.all([
          import('pkg-dir'),
          import('@rollup/plugin-alias'),
          quiltPolyfillFeatures!.run(),
        ]);

      const featuresNeedingPolyfills =
        await quiltPolyfillFeaturesForEnvironment!.run(allNecessaryFeatures);

      const aliases: Record<string, string> = {};

      await Promise.all(
        ALIAS_DEPENDENCIES.map(async (dependency) => {
          const dependencyRoot = await packageDirectory({
            cwd: require.resolve(dependency),
          });

          if (dependencyRoot) {
            aliases[dependency] = dependencyRoot;
          }
        }),
      );

      const polyfillPlugin = await polyfillRollup({
        package: packageName,
        features: featuresNeedingPolyfills,
        target: await browserslistTargets?.run([]),
      });

      return [
        alias({
          entries: aliases,
        }),
        polyfillPlugin,
        ...plugins,
      ];
    });
  }
}

interface RollupOptions {
  target?: string[] | 'node';
  features?: PolyfillFeature[];
  sourceMap?: boolean;
  package?: string;
}

async function polyfillRollup({
  target,
  features,
  sourceMap = true,
  package: packageName,
}: RollupOptions): Promise<RollupPlugin> {
  const [{default: MagicString}, {polyfillAliasesForTarget}] =
    await Promise.all([import('magic-string'), import('@quilted/polyfills')]);

  const polyfills = new Map(
    target
      ? Object.entries(polyfillAliasesForTarget(target, {package: packageName}))
      : undefined,
  );

  let entries: string[] = [];

  return {
    name: '@quilted/polyfills',
    options(options) {
      const inputOption = options.input;

      if (inputOption == null) return;
      if (Array.isArray(inputOption)) {
        entries = [...inputOption];
      } else {
        entries = Object.values(inputOption);
      }
    },
    transform(code, id) {
      if (features == null || features.length === 0) return null;

      // I don’t know why this doesn’t work... my guess is that it fails if the entry is a virtual module?
      // const isEntry = this.getModuleInfo(id)?.isEntry ?? false;
      const isEntry = entries.includes(id);
      if (!isEntry) return null;

      // This thing helps with generating source maps...
      // @see https://github.com/rollup/plugins/blob/master/packages/inject/source/index.js#L203
      const magicString = new MagicString(code);

      magicString.prepend(
        `${features
          .map((feature) => {
            const mappedPolyfill = polyfills.get(feature);

            if (!mappedPolyfill) {
              throw new Error(
                `No polyfill available for feature ${JSON.stringify(feature)}`,
              );
            }

            return `import ${JSON.stringify(mappedPolyfill)};`;
          })
          .join('\n')}\n`,
      );

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap({hires: true}) : null,
      };
    },
  };
}
