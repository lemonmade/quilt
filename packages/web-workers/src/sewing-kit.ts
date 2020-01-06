import {
  Project,
  Service,
  createProjectPlugin,
  WaterfallHook,
} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';
import {} from '@sewing-kit/plugin-babel';

import {Runner} from './types';

const PLUGIN = 'Quilt.WebWorkers';

export interface Options {}

type BabelOptions = import('./babel-plugin').Options;

interface Hooks {
  readonly quiltWorkerWebpackPlugins: WaterfallHook<
    readonly import('webpack').Plugin[]
  >;
  readonly quiltWorkerWebpackGlobalObject: WaterfallHook<string>;
  readonly quiltWorkerNoop: WaterfallHook<boolean>;
  readonly quiltWorkerApplyBabelToPackages: WaterfallHook<
    NonNullable<BabelOptions['packages']>
  >;
}

declare module '@sewing-kit/hooks' {
  interface DevProjectConfigurationCustomHooks extends Hooks {}
  interface BuildProjectConfigurationCustomHooks extends Hooks {}
}

const addHooks = (hooks: any) => ({
  ...hooks,
  quiltWorkerWebpackPlugins: new WaterfallHook(),
  quiltWorkerWebpackGlobalObject: new WaterfallHook(),
  quiltWorkerNoop: new WaterfallHook(),
  quiltWorkerApplyBabelToPackages: new WaterfallHook(),
});

export function webWorkers(_options?: Options) {
  createProjectPlugin(PLUGIN, ({tasks: {dev, build}, project}) => {
    dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(project, configure),
        );
        configure.webpackPlugins?.hook(createWebpackPluginAdder(configure));
      });
    });

    build.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(project, configure),
        );
        configure.webpackPlugins?.hook(createWebpackPluginAdder(configure));
      });
    });
  });
}

const DEFAULT_EXPORTS_TO_PROCESS: import('./babel-plugin').ProcessableImport[] = [
  {name: 'createWorkerFactory', runner: Runner.Expose},
  {name: 'createPlainWorkerFactory', runner: Runner.None},
  {name: 'createWorkerComponent', runner: Runner.React},
];

function createBabelConfigUpdater(project: Project, configure: Partial<Hooks>) {
  return async (
    babelConfig: import('@sewing-kit/plugin-babel').BabelConfig,
  ): Promise<typeof babelConfig> => {
    const [noop, packages] = await Promise.all([
      configure.quiltWorkerNoop!.run(project instanceof Service),
      configure.quiltWorkerApplyBabelToPackages!.run({
        '@quilted/quilt': DEFAULT_EXPORTS_TO_PROCESS,
        '@quilted/web-workers': DEFAULT_EXPORTS_TO_PROCESS,
      }),
    ] as const);

    return {
      ...babelConfig,
      plugins: [
        ...(babelConfig.plugins ?? []),
        [require.resolve('./babel-plugin'), {noop, packages} as BabelOptions],
      ],
    };
  };
}

function createWebpackPluginAdder(configure: Partial<Hooks>) {
  return async (plugins: readonly import('webpack').Plugin[]) => {
    const [{WebWorkerPlugin}, globalObject, workerPlugins] = await Promise.all([
      import('./webpack-parts'),
      configure.quiltWorkerWebpackGlobalObject!.run('self'),
      configure.quiltWorkerWebpackPlugins!.run([]),
    ] as const);

    return [
      ...plugins,
      new WebWorkerPlugin({globalObject, plugins: workerPlugins}),
    ];
  };
}
