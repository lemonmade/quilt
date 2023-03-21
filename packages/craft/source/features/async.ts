import {createRequire} from 'module';

import type {Options as BabelOptions} from '@quilted/async/babel';
import type {Options as RollupOptions} from '@quilted/async/rollup';

import {createProjectPlugin} from '../kit';
import type {
  WaterfallHookWithDefault,
  ResolvedHooks,
  BuildProjectConfigurationHooks,
} from '../kit';

import type {} from './assets';

export interface Options extends Omit<RollupOptions, 'assetBaseUrl'> {
  readonly applyBabelToPackages?: BabelOptions['packages'];
}

export interface AsyncHooks {
  quiltAsyncApplyBabelToPackages: WaterfallHookWithDefault<
    NonNullable<BabelOptions['packages']>
  >;
  quiltAsyncPreload: WaterfallHookWithDefault<
    NonNullable<RollupOptions['preload']>
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
      }));

      configure((hooks) => {
        const {babelPlugins, rollupPlugins} = hooks;

        babelPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncBabelPlugin(hooks)];
        });

        rollupPlugins?.(async (plugins) => {
          return [...plugins, await getAsyncRollupPlugin(hooks, {moduleId})];
        });

        function moduleId({imported}: {imported: string}) {
          return project.fs.relativePath(imported);
        }
      });
    },
    develop({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
        quiltAsyncPreload: waterfall<NonNullable<RollupOptions['preload']>>({
          default: preload,
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
    quiltAssetBaseUrl,
    quiltAsyncPreload,
  }: ResolvedHooks<BuildProjectConfigurationHooks>,
  options: Partial<RollupOptions> = {},
) {
  const [{asyncQuilt}, preload, assetBaseUrl] = await Promise.all([
    import('@quilted/async/rollup'),
    quiltAsyncPreload!.run(),
    quiltAssetBaseUrl!.run(),
  ]);

  return asyncQuilt({
    preload,
    assetBaseUrl,
    ...options,
  });
}
