import {createRequire} from 'module';

import type {Options as BabelOptions} from '@quilted/async/babel';
import type {
  Options as RollupOptions,
  ManifestOptions,
} from '@quilted/async/rollup';

import {createProjectPlugin} from '../kit';
import type {WaterfallHookWithDefault, ResolvedHooks} from '../kit';

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
  interface BuildProjectConfigurationHooks extends AsyncHooks {}
  interface DevelopProjectConfigurationHooks extends AsyncHooks {}
}

const DEFAULT_PACKAGES_TO_PROCESS = {
  '@quilted/async': ['createAsyncModule'],
  '@quilted/quilt': ['createAsyncModule', 'createAsyncComponent'],
  '@quilted/react-async': ['createAsyncModule', 'createAsyncComponent'],
};

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

      configure((hooks) => {
        const {babelPlugins, rollupPlugins} = hooks;

        babelPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncBabelPlugin(hooks)];
        });

        rollupPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncRollupPlugin(hooks)];
        });
      });
    },
    develop({project, hooks, configure}) {
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
        >({default: '/'}),
        quiltAsyncManifest: waterfall<boolean>({
          default: false,
        }),
        quiltAsyncManifestPath: waterfall<ManifestOptions['path']>({
          default: project.fs.buildPath('async-manifest.json'),
        }),
        quiltAsyncManifestMetadata: waterfall<
          NonNullable<ManifestOptions['metadata']>
        >({
          default: () => ({}),
        }),
      }));

      configure((hooks) => {
        const {babelPlugins, rollupPlugins, vitePlugins} = hooks;

        babelPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncBabelPlugin(hooks)];
        });

        rollupPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncRollupPlugin(hooks, {moduleId})];
        });

        vitePlugins?.(async (plugins) => {
          const plugin = await getAsyncRollupPlugin(hooks, {moduleId});
          return [...plugins, {...plugin, enforce: 'pre'}];
        });

        function moduleId({imported}: {imported: string}) {
          return `/@id/quilt-async-import:${imported}`;
        }
      });
    },
  });
}

async function getAsyncBabelPlugin({
  quiltAsyncApplyBabelToPackages,
}: ResolvedHooks<AsyncHooks>) {
  const [packages] = await Promise.all([quiltAsyncApplyBabelToPackages!.run()]);

  return [require.resolve('@quilted/async/babel'), {packages} as BabelOptions];
}

async function getAsyncRollupPlugin(
  {
    quiltAsyncPreload,
    quiltAsyncAssetBaseUrl,
    quiltAsyncManifest,
    quiltAsyncManifestPath,
    quiltAsyncManifestMetadata,
  }: ResolvedHooks<AsyncHooks>,
  options: Partial<RollupOptions> = {},
) {
  const [
    {asyncQuilt},
    preload,
    assetBaseUrl,
    includeManifest,
    manifestPath,
    manifestMetadata,
  ] = await Promise.all([
    import('@quilted/async/rollup'),
    quiltAsyncPreload!.run(),
    quiltAsyncAssetBaseUrl!.run(),
    quiltAsyncManifest!.run(),
    quiltAsyncManifestPath!.run(),
    quiltAsyncManifestMetadata!.run(),
  ]);

  return asyncQuilt({
    preload,
    manifest: includeManifest && {
      path: manifestPath,
      metadata: manifestMetadata,
    },
    assetBaseUrl,
    ...options,
  });
}
