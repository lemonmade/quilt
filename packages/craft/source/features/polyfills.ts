import {createRequire} from 'module';
import type {Plugin as RollupPlugin} from 'rollup';
import type {PolyfillFeature} from '@quilted/polyfills';

import {createProjectPlugin} from '../kit.ts';
import type {
  WaterfallHook,
  WaterfallHookWithDefault,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit.ts';

import {addRollupOnWarn} from '../tools/rollup.ts';
import type {} from '../tools/jest.ts';
import type {} from './targets.ts';

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

  /**
   * The package to import polyfills from. Defaults to `@quilted/polyfills` if this
   * dependency is installed for the project, otherwise `@quilted/quilt/polyfills`.
   */
  quiltPolyfillPackage: WaterfallHookWithDefault<string>;
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
    build({configure, hooks, project}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
        quiltPolyfillFeaturesForEnvironment: waterfall(),
        quiltPolyfillPackage: waterfall<string>({
          default: () =>
            packageName ??
            (project.hasDependency('@quilted/polyfills', {all: true})
              ? '@quilted/polyfills'
              : '@quilted/quilt/polyfills'),
        }),
      }));

      configure(addConfiguration);
    },
    develop({configure, hooks, project}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
        quiltPolyfillFeaturesForEnvironment: waterfall(),
        quiltPolyfillPackage: waterfall<string>({
          default: () =>
            packageName ??
            (project.hasDependency('@quilted/polyfills', {all: true})
              ? '@quilted/polyfills'
              : '@quilted/quilt/polyfills'),
        }),
      }));

      configure(addConfiguration);
    },
    test({configure, hooks, project}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
        quiltPolyfillFeaturesForEnvironment: waterfall(),
        quiltPolyfillPackage: waterfall<string>({
          default: () =>
            packageName ??
            (project.hasDependency('@quilted/polyfills', {all: true})
              ? '@quilted/polyfills'
              : '@quilted/quilt/polyfills'),
        }),
      }));

      configure(
        ({
          jestModuleMapper,
          quiltPolyfillFeatures,
          quiltPolyfillPackage,
          quiltPolyfillFeaturesForEnvironment,
        }) => {
          jestModuleMapper?.(async (moduleMappings) => {
            const [
              {polyfillAliasesForTarget},
              allNecessaryFeatures,
              polyfillPackage,
            ] = await Promise.all([
              import('@quilted/polyfills'),
              quiltPolyfillFeatures!.run(),
              quiltPolyfillPackage!.run(),
            ]);

            const featuresNeedingPolyfills =
              await quiltPolyfillFeaturesForEnvironment!.run(
                allNecessaryFeatures,
              );

            const mappedPolyfills = polyfillAliasesForTarget('node', {
              package: polyfillPackage,
              features: featuresNeedingPolyfills,
              polyfill: 'usage',
            });

            for (const [polyfill, mappedPolyfill] of Object.entries(
              mappedPolyfills,
            )) {
              if (!mappedPolyfill) continue;
              moduleMappings[`^${polyfillPackage}/${polyfill}$`] =
                mappedPolyfill;
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
    quiltPolyfillPackage,
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
      const [
        {packageDirectory},
        {default: alias},
        allNecessaryFeatures,
        polyfillPackage,
      ] = await Promise.all([
        import('pkg-dir'),
        import('@rollup/plugin-alias'),
        quiltPolyfillFeatures!.run(),
        quiltPolyfillPackage!.run(),
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
        package: polyfillPackage,
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
