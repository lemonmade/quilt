import {createProjectPlugin, WaterfallHook} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-babel';

import {
  Options as BabelOptions,
  DEFAULT_PACKAGES_TO_PROCESS,
} from './babel-plugin';

const PLUGIN = 'Quilt.Async';

export interface Options {
  moduleId?: BabelOptions['moduleId'];
  applyBabelToPackages?: BabelOptions['packages'];
}

interface Hooks {
  readonly quiltAsyncModuleId: WaterfallHook<NonNullable<Options['moduleId']>>;
  readonly quiltAsyncApplyBabelToPackages: WaterfallHook<
    NonNullable<BabelOptions['packages']>
  >;
}

declare module '@sewing-kit/hooks' {
  interface TestProjectConfigurationCustomHooks extends Hooks {}
  interface DevProjectConfigurationCustomHooks extends Hooks {}
  interface BuildProjectConfigurationCustomHooks extends Hooks {}
}

const addHooks = (hooks: any) => ({
  ...hooks,
  quiltAsyncModuleId: new WaterfallHook(),
  quiltAsyncApplyBabelToPackages: new WaterfallHook(),
});

export function asyncQuilt(options: Options = {}) {
  return createProjectPlugin(PLUGIN, ({tasks: {dev, build, test}}) => {
    dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(configure, options),
        );
      });
    });

    test.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(configure, {
            ...options,
            moduleId: 'requireResolve',
          }),
        );
      });
    });

    build.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(configure, options),
        );
      });
    });
  });
}

function createBabelConfigUpdater(
  configure: Partial<Hooks>,
  {
    moduleId: defaultModuleId = 'webpackResolveWeak',
    applyBabelToPackages = {},
  }: Options,
) {
  return async (
    babelConfig: import('@sewing-kit/plugin-babel').BabelConfig,
  ): Promise<typeof babelConfig> => {
    const [moduleId, packages] = await Promise.all([
      configure.quiltAsyncModuleId!.run(defaultModuleId),
      configure.quiltAsyncApplyBabelToPackages!.run({
        ...DEFAULT_PACKAGES_TO_PROCESS,
        ...applyBabelToPackages,
      }),
    ] as const);

    return {
      ...babelConfig,
      plugins: [
        ...(babelConfig.plugins ?? []),
        [
          require.resolve('./babel-plugin'),
          {moduleId, packages} as BabelOptions,
        ],
      ],
    };
  };
}
