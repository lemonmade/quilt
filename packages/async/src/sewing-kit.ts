import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  WaterfallHookWithDefault,
  ResolvedHooks,
} from '@quilted/sewing-kit';

import {DEFAULT_PACKAGES_TO_PROCESS} from './babel-plugin';
import type {Options as BabelOptions} from './babel-plugin';
import type {Options as RollupOptions} from './rollup-parts';

import type {BabelHooks} from '@quilted/sewing-kit-babel';
import type {RollupHooks} from '@quilted/sewing-kit-rollup';

export interface Options extends RollupOptions {
  readonly applyBabelToPackages?: BabelOptions['packages'];
}

export interface AsyncHooks {
  quiltAsyncApplyBabelToPackages: WaterfallHookWithDefault<
    NonNullable<BabelOptions['packages']>
  >;
  quiltAsyncPreload: WaterfallHookWithDefault<
    NonNullable<RollupOptions['preload']>
  >;
  quiltAsyncAssetBaseUrl: WaterfallHookWithDefault<
    NonNullable<RollupOptions['assetBaseUrl']>
  >;
  quiltAsyncManifest: WaterfallHookWithDefault<
    NonNullable<RollupOptions['manifest']>
  >;
}

declare module '@quilted/sewing-kit' {
  interface TestProjectConfigurationHooks extends AsyncHooks {}
  interface DevelopProjectConfigurationHooks extends AsyncHooks {}
  interface BuildProjectConfigurationHooks extends AsyncHooks {}
}

export function asyncQuilt({
  applyBabelToPackages:
    defaultApplyBabelToPackages = DEFAULT_PACKAGES_TO_PROCESS,
  assetBaseUrl = '/assets/',
  manifest,
  preload = true,
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Async',
    develop({workspace, hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
        quiltAsyncPreload: waterfall<NonNullable<RollupOptions['preload']>>({
          default: preload,
        }),
        quiltAsyncAssetBaseUrl: waterfall<
          NonNullable<RollupOptions['assetBaseUrl']>
        >({default: assetBaseUrl}),
        quiltAsyncManifest: waterfall<NonNullable<RollupOptions['manifest']>>({
          default: manifest ?? workspace.fs.buildPath('async-manifest.json'),
        }),
      }));

      configure(addConfiguration());
    },
    build({workspace, hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
        quiltAsyncPreload: waterfall<NonNullable<RollupOptions['preload']>>({
          default: preload,
        }),
        quiltAsyncAssetBaseUrl: waterfall<
          NonNullable<RollupOptions['assetBaseUrl']>
        >({default: assetBaseUrl}),
        quiltAsyncManifest: waterfall<NonNullable<RollupOptions['manifest']>>({
          default: manifest ?? workspace.fs.buildPath('async-manifest.json'),
        }),
      }));

      configure(addConfiguration());
    },
    test({workspace, hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
        quiltAsyncPreload: waterfall<NonNullable<RollupOptions['preload']>>({
          default: preload,
        }),
        quiltAsyncAssetBaseUrl: waterfall<
          NonNullable<RollupOptions['assetBaseUrl']>
        >({default: assetBaseUrl}),
        quiltAsyncManifest: waterfall<NonNullable<RollupOptions['manifest']>>({
          default: manifest ?? workspace.fs.buildPath('async-manifest.json'),
        }),
      }));

      configure(addConfiguration());
    },
  });

  function addConfiguration() {
    return ({
      babelPlugins,
      rollupPlugins,
      quiltAsyncPreload,
      quiltAsyncAssetBaseUrl,
      quiltAsyncManifest,
      quiltAsyncApplyBabelToPackages,
    }: ResolvedHooks<BabelHooks & RollupHooks & AsyncHooks>) => {
      babelPlugins?.(async (plugins) => {
        const [packages] = await Promise.all([
          quiltAsyncApplyBabelToPackages!.run(),
        ]);

        plugins.push(['@quilted/async/babel', {packages} as BabelOptions]);

        return plugins;
      });

      rollupPlugins?.(async (plugins) => {
        const [{asyncQuilt}, preload, assetBaseUrl, manifest] =
          await Promise.all([
            import('./rollup-parts'),
            quiltAsyncPreload!.run(),
            quiltAsyncAssetBaseUrl!.run(),
            quiltAsyncManifest!.run(),
          ]);

        plugins.push(asyncQuilt({preload, manifest, assetBaseUrl}));

        return plugins;
      });
    };
  }
}
