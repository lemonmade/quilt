import type {InputOptions, OutputOptions, Plugin} from 'rollup';
import {createProjectPlugin, Runtime} from '@quilted/sewing-kit';
import type {App, WaterfallHook, ResolvedHooks} from '@quilted/sewing-kit';
import type {BabelHooks} from '@quilted/sewing-kit-babel';
import type {RollupHooks} from '@quilted/sewing-kit-rollup';
import type {ViteHooks} from '@quilted/sewing-kit-vite';

import type {
  Options as RollupOptions,
  WorkerContext,
  PublicPathContext,
} from './rollup-parts';
import type {Options as BabelOptions} from './babel';

export interface Options {}

export interface WorkerHooks {
  readonly quiltWorkerNoop: WaterfallHook<boolean>;
  readonly quiltWorkerWrite: WaterfallHook<boolean>;
  readonly quiltWorkerPackages: WaterfallHook<BabelOptions['packages']>;
  readonly quiltWorkerContent: WaterfallHook<
    string | undefined,
    [WorkerContext]
  >;
  readonly quiltWorkerRollupInputOptions: WaterfallHook<
    InputOptions,
    [WorkerContext]
  >;
  readonly quiltWorkerRollupOutputOptions: WaterfallHook<
    OutputOptions,
    [WorkerContext]
  >;
  readonly quiltWorkerRollupPlugins: WaterfallHook<Plugin[], [WorkerContext]>;
  readonly quiltWorkerRollupPublicPath: WaterfallHook<
    string | undefined,
    [PublicPathContext]
  >;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends WorkerHooks {}
  interface DevelopAppConfigurationHooks extends WorkerHooks {}
  interface TestAppConfigurationHooks extends WorkerHooks {}
}

export function workers() {
  return createProjectPlugin<App>({
    name: 'Quilt.Workers',
    build({hooks, configure}) {
      hooks<WorkerHooks>(({waterfall}) => ({
        quiltWorkerContent: waterfall(),
        quiltWorkerNoop: waterfall(),
        quiltWorkerPackages: waterfall(),
        quiltWorkerRollupInputOptions: waterfall(),
        quiltWorkerRollupOutputOptions: waterfall(),
        quiltWorkerRollupPlugins: waterfall(),
        quiltWorkerRollupPublicPath: waterfall(),
        quiltWorkerWrite: waterfall(),
      }));

      configure((configuration) => {
        addConfiguration(configuration, {
          noop: async () => {
            const resolvedRuntime = await configuration.runtime.run();
            return !resolvedRuntime.includes(Runtime.Browser);
          },
        });
      });
    },
    develop({hooks, configure}) {
      hooks<WorkerHooks>(({waterfall}) => ({
        quiltWorkerContent: waterfall(),
        quiltWorkerNoop: waterfall(),
        quiltWorkerPackages: waterfall(),
        quiltWorkerRollupInputOptions: waterfall(),
        quiltWorkerRollupOutputOptions: waterfall(),
        quiltWorkerRollupPlugins: waterfall(),
        quiltWorkerRollupPublicPath: waterfall(),
        quiltWorkerWrite: waterfall(),
      }));

      configure((configuration) => {
        addConfiguration(configuration, {
          noop: async () => {
            const resolvedRuntime = await configuration.runtime.run();
            return !resolvedRuntime.includes(Runtime.Browser);
          },
        });
      });
    },
    test({hooks, configure}) {
      hooks<WorkerHooks>(({waterfall}) => ({
        quiltWorkerContent: waterfall(),
        quiltWorkerNoop: waterfall(),
        quiltWorkerPackages: waterfall(),
        quiltWorkerRollupInputOptions: waterfall(),
        quiltWorkerRollupOutputOptions: waterfall(),
        quiltWorkerRollupPlugins: waterfall(),
        quiltWorkerRollupPublicPath: waterfall(),
        quiltWorkerWrite: waterfall(),
      }));

      configure((configuration) => {
        addConfiguration(configuration, {noop: () => true});
      });
    },
  });

  function addConfiguration(
    {
      rollupPlugins,
      vitePlugins,
      babelPlugins,
      quiltWorkerNoop,
      quiltWorkerWrite,
      quiltWorkerContent,
      quiltWorkerPackages,
      quiltWorkerRollupPlugins,
      quiltWorkerRollupInputOptions,
      quiltWorkerRollupOutputOptions,
      quiltWorkerRollupPublicPath,
    }: ResolvedHooks<WorkerHooks & RollupHooks & BabelHooks & ViteHooks>,
    {noop: shouldNoop}: {noop(): boolean | Promise<boolean>},
  ) {
    rollupPlugins?.(async (plugins) => {
      const defaultNoop = await shouldNoop();

      const [noop, write, {workers}] = await Promise.all([
        quiltWorkerNoop!.run(defaultNoop),
        quiltWorkerWrite!.run(defaultNoop),
        import('./rollup-parts'),
      ]);

      if (noop) return plugins;

      const options: RollupOptions = {
        write,
        contentForWorker: (context) =>
          quiltWorkerContent!.run(undefined, context),
        plugins: (plugins, context) =>
          quiltWorkerRollupPlugins!.run(plugins, context),
        inputOptions: (inputOptions, context) =>
          quiltWorkerRollupInputOptions!.run(inputOptions, context),
        outputOptions: (outputOptions, context) =>
          quiltWorkerRollupOutputOptions!.run(outputOptions, context),
        publicPath: (context) =>
          quiltWorkerRollupPublicPath!.run(undefined, context),
      };

      plugins.push(workers(options));

      return plugins;
    });

    vitePlugins?.(async (plugins) => {
      const defaultNoop = await shouldNoop();

      const [noop, write, {workers}] = await Promise.all([
        quiltWorkerNoop!.run(defaultNoop),
        quiltWorkerWrite!.run(true),
        import('./rollup-parts'),
      ]);

      if (noop) return plugins;

      const options: RollupOptions = {
        write,
        contentForWorker: (context) =>
          quiltWorkerContent!.run(undefined, context),
        plugins: (plugins, context) =>
          quiltWorkerRollupPlugins!.run(plugins, context),
        inputOptions: (inputOptions, context) =>
          quiltWorkerRollupInputOptions!.run(inputOptions, context),
        outputOptions: (outputOptions, context) =>
          quiltWorkerRollupOutputOptions!.run(outputOptions, context),
        publicPath: (context) =>
          quiltWorkerRollupPublicPath!.run(undefined, context),
      };

      plugins.push(workers(options));

      return plugins;
    });

    babelPlugins?.(async (plugins) => {
      const defaultNoop = await shouldNoop();

      const [noop, packages] = await Promise.all([
        quiltWorkerNoop!.run(defaultNoop),
        quiltWorkerPackages!.run(undefined),
      ]);

      const options: BabelOptions = {noop, packages};

      plugins.push(['@quilted/workers/babel', options]);

      return plugins;
    });
  }
}
