import {
  Task,
  addHooks as createAddHooks,
  WaterfallHook,
  createProjectPlugin,
} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-javascript';

import {DEFAULT_PACKAGES_TO_PROCESS} from './babel-plugin';
import type {Options as BabelOptions} from './babel-plugin';

const PLUGIN = 'Quilt.Async';

interface ConfigurationContext {
  readonly task: Task;
}

type ValueOrContextThunk<T> = T | ((context: ConfigurationContext) => T);

export interface Options {
  readonly moduleSystem?: ValueOrContextThunk<BabelOptions['moduleSystem']>;
  readonly applyBabelToPackages?: ValueOrContextThunk<BabelOptions['packages']>;
}

interface Hooks {
  readonly quiltAsyncModuleSystem: WaterfallHook<Options['moduleSystem']>;
  readonly quiltAsyncApplyBabelToPackages: WaterfallHook<
    BabelOptions['packages']
  >;
}

declare module '@sewing-kit/hooks' {
  interface TestProjectConfigurationCustomHooks extends Hooks {}
  interface DevProjectConfigurationCustomHooks extends Hooks {}
  interface BuildProjectConfigurationCustomHooks extends Hooks {}
}

const addHooks = createAddHooks<Hooks>(() => ({
  quiltAsyncModuleSystem: new WaterfallHook(),
  quiltAsyncApplyBabelToPackages: new WaterfallHook(),
}));

export function asyncQuilt(options: Options = {}) {
  return createProjectPlugin(PLUGIN, ({tasks: {dev, build, test}}) => {
    dev.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configure) => {
        configure.babelConfig?.hook(
          createBabelConfigUpdater(configure, {task: Task.Dev}, options),
        );
      });
    });

    test.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);
      hooks.configure.hook((configuration) => {
        configuration.babelConfig?.hook(
          createBabelConfigUpdater(
            configuration,
            {task: Task.Test},
            {
              ...options,
              moduleSystem: 'commonjs',
            },
          ),
        );
      });
    });

    build.hook(({hooks}) => {
      hooks.configureHooks.hook(addHooks);

      hooks.target.hook(({hooks}) => {
        hooks.configure.hook((configuration) => {
          configuration.babelConfig?.hook(
            createBabelConfigUpdater(
              configuration,
              {task: Task.Build},
              options,
            ),
          );
        });
      });
    });
  });
}

function createBabelConfigUpdater(
  configure: Partial<Hooks>,
  context: ConfigurationContext,
  {moduleSystem: defaultModuleSystem, applyBabelToPackages = {}}: Options,
) {
  return async (
    babelConfig: import('@sewing-kit/plugin-javascript').BabelConfig,
  ): Promise<typeof babelConfig> => {
    const [moduleSystem, packages] = await Promise.all([
      configure.quiltAsyncModuleSystem!.run(
        typeof defaultModuleSystem === 'function'
          ? defaultModuleSystem(context)
          : defaultModuleSystem,
      ),
      configure.quiltAsyncApplyBabelToPackages!.run({
        ...DEFAULT_PACKAGES_TO_PROCESS,
        ...(typeof applyBabelToPackages === 'function'
          ? applyBabelToPackages(context) ?? {}
          : applyBabelToPackages),
      }),
    ]);

    return {
      ...babelConfig,
      plugins: [
        ...((babelConfig.plugins as any) ?? []),
        ['@quilted/async/babel', {moduleSystem, packages} as BabelOptions],
      ],
    };
  };
}
