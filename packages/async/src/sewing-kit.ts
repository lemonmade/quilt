import {Task, createProjectPlugin} from '@quilted/sewing-kit';
import type {WaterfallHook, ResolvedHooks} from '@quilted/sewing-kit';

import {DEFAULT_PACKAGES_TO_PROCESS} from './babel-plugin';
import type {Options as BabelOptions} from './babel-plugin';

import type {BabelHooks} from '@quilted/sewing-kit-babel';

export interface Options {
  readonly moduleSystem?: BabelOptions['moduleSystem'];
  readonly applyBabelToPackages?: BabelOptions['packages'];
}

export interface AsyncHooks {
  quiltAsyncModuleSystem: WaterfallHook<Options['moduleSystem']>;
  quiltAsyncApplyBabelToPackages: WaterfallHook<BabelOptions['packages']>;
}

declare module '@quilted/sewing-kit' {
  interface TestProjectConfigurationHooks extends AsyncHooks {}
  interface DevelopProjectConfigurationHooks extends AsyncHooks {}
  interface BuildProjectConfigurationHooks extends AsyncHooks {}
}

export function asyncQuilt({
  moduleSystem: defaultModuleSystem,
  applyBabelToPackages:
    defaultApplyBabelToPackages = DEFAULT_PACKAGES_TO_PROCESS,
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Async',
    develop({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncModuleSystem: waterfall(),
        quiltAsyncApplyBabelToPackages: waterfall(),
      }));

      configure(addConfiguration({task: Task.Develop}));
    },
    build({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncModuleSystem: waterfall(),
        quiltAsyncApplyBabelToPackages: waterfall(),
      }));

      configure(addConfiguration({task: Task.Build}));
    },
    test({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncModuleSystem: waterfall(),
        quiltAsyncApplyBabelToPackages: waterfall(),
      }));

      configure(addConfiguration({task: Task.Test}));
    },
  });

  function addConfiguration({task}: {task: Task}) {
    return ({
      babelPlugins,
      quiltAsyncModuleSystem,
      quiltAsyncApplyBabelToPackages,
    }: ResolvedHooks<BabelHooks & AsyncHooks>) => {
      babelPlugins?.(async (plugins) => {
        const [moduleSystem, packages] = await Promise.all([
          quiltAsyncModuleSystem!.run(
            defaultModuleSystem ?? task === Task.Test ? 'commonjs' : 'systemjs',
          ),
          quiltAsyncApplyBabelToPackages!.run(defaultApplyBabelToPackages),
        ]);

        plugins.push([
          '@quilted/async/babel',
          {moduleSystem, packages} as BabelOptions,
        ]);

        return plugins;
      });
    };
  }
}
