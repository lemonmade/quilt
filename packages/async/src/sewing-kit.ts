import {createRequire} from 'module';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  WaterfallHookWithDefault,
  ResolvedHooks,
} from '@quilted/sewing-kit';

import {DEFAULT_PACKAGES_TO_PROCESS} from './babel-plugin';
import type {Options as BabelOptions} from './babel-plugin';
import type {Options as RollupOptions, ManifestOptions} from './rollup-parts';

import type {BabelHooks} from '@quilted/sewing-kit-babel';
import type {RollupHooks} from '@quilted/sewing-kit-rollup';

export interface Options extends Omit<RollupOptions, 'manifest'> {
  readonly manifest?: boolean | string;
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
  quiltAsyncManifest: WaterfallHookWithDefault<boolean>;
  quiltAsyncManifestPath: WaterfallHookWithDefault<ManifestOptions['path']>;
  quiltAsyncManifestMetadata: WaterfallHookWithDefault<
    NonNullable<ManifestOptions['metadata']>
  >;
}

declare module '@quilted/sewing-kit' {
  interface TestProjectConfigurationHooks extends AsyncHooks {}
  interface DevelopProjectConfigurationHooks extends AsyncHooks {}
  interface BuildProjectConfigurationHooks extends AsyncHooks {}
}

const require = createRequire(import.meta.url);

export function asyncQuilt({
  applyBabelToPackages:
    defaultApplyBabelToPackages = DEFAULT_PACKAGES_TO_PROCESS,
  assetBaseUrl = '/assets/',
  manifest,
  preload = true,
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Async',
    develop({project, hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: () => ({...defaultApplyBabelToPackages}),
        }),
        quiltAsyncPreload: waterfall<NonNullable<RollupOptions['preload']>>({
          default: preload,
        }),
        quiltAsyncAssetBaseUrl: waterfall<
          NonNullable<RollupOptions['assetBaseUrl']>
        >({default: assetBaseUrl}),
        quiltAsyncManifest: waterfall<boolean>({
          default: true,
        }),
        quiltAsyncManifestPath: waterfall<ManifestOptions['path']>({
          default:
            typeof manifest === 'string'
              ? manifest
              : project.fs.buildPath('async-manifest.json'),
        }),
        quiltAsyncManifestMetadata: waterfall<
          NonNullable<ManifestOptions['metadata']>
        >({
          default: () => ({}),
        }),
      }));

      configure(addConfiguration());
    },
    build({project, hooks, configure}) {
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
        quiltAsyncManifest: waterfall<boolean>({
          default: true,
        }),
        quiltAsyncManifestPath: waterfall<ManifestOptions['path']>({
          default:
            typeof manifest === 'string'
              ? manifest
              : project.fs.buildPath('async-manifest.json'),
        }),
        quiltAsyncManifestMetadata: waterfall<
          NonNullable<ManifestOptions['metadata']>
        >({
          default: () => ({}),
        }),
      }));

      configure(addConfiguration());
    },
    test({project, hooks, configure}) {
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
        quiltAsyncManifest: waterfall<boolean>({
          default: true,
        }),
        quiltAsyncManifestPath: waterfall<ManifestOptions['path']>({
          default:
            typeof manifest === 'string'
              ? manifest
              : project.fs.buildPath('async-manifest.json'),
        }),
        quiltAsyncManifestMetadata: waterfall<
          NonNullable<ManifestOptions['metadata']>
        >({
          default: () => ({}),
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
      quiltAsyncManifestPath,
      quiltAsyncManifestMetadata,
      quiltAsyncApplyBabelToPackages,
    }: ResolvedHooks<BabelHooks & RollupHooks & AsyncHooks>) => {
      babelPlugins?.(async (plugins) => {
        const [packages] = await Promise.all([
          quiltAsyncApplyBabelToPackages!.run(),
        ]);

        plugins.push([
          require.resolve('@quilted/async/babel'),
          {packages} as BabelOptions,
        ]);

        return plugins;
      });

      rollupPlugins?.(async (plugins) => {
        const [
          {asyncQuilt},
          preload,
          assetBaseUrl,
          includeManifest,
          manifestPath,
          manifestMetadata,
        ] = await Promise.all([
          import('./rollup-parts'),
          quiltAsyncPreload!.run(),
          quiltAsyncAssetBaseUrl!.run(),
          quiltAsyncManifest!.run(),
          quiltAsyncManifestPath!.run(),
          quiltAsyncManifestMetadata!.run(),
        ]);

        plugins.push(
          asyncQuilt({
            preload,
            manifest: includeManifest && {
              path: manifestPath,
              metadata: manifestMetadata,
            },
            assetBaseUrl,
          }),
        );

        return plugins;
      });
    };
  }
}
