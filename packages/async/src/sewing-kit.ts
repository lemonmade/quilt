import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  WaterfallHookWithDefault,
  ResolvedHooks,
} from '@quilted/sewing-kit';

import {DEFAULT_PACKAGES_TO_PROCESS} from './babel-plugin';
import type {Options as BabelOptions} from './babel-plugin';

import type {BabelHooks} from '@quilted/sewing-kit-babel';
import type {RollupHooks} from '@quilted/sewing-kit-rollup';

export interface Options {
  readonly applyBabelToPackages?: BabelOptions['packages'];
}

export interface AsyncHooks {
  quiltAsyncApplyBabelToPackages: WaterfallHookWithDefault<
    NonNullable<BabelOptions['packages']>
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
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Async',
    develop({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
      }));

      configure(addConfiguration());
    },
    build({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
      }));

      configure(addConfiguration());
    },
    test({hooks, configure}) {
      hooks<AsyncHooks>(({waterfall}) => ({
        quiltAsyncApplyBabelToPackages: waterfall<
          NonNullable<BabelOptions['packages']>
        >({
          default: defaultApplyBabelToPackages,
        }),
      }));

      configure(addConfiguration());
    },
  });

  function addConfiguration() {
    return ({
      babelPlugins,
      rollupPlugins,
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
        const {asyncQuilt} = await import('./rollup-parts');

        plugins.push(asyncQuilt());

        return plugins;
      });
    };
  }
}
