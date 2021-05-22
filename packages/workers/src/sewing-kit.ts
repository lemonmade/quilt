import type {InputOptions, OutputOptions, Plugin} from 'rollup';
import {
  WebApp,
  Target,
  createProjectPlugin,
  addHooks,
  Task,
  WaterfallHook,
  TargetRuntime,
  Runtime,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
} from '@sewing-kit/hooks';
import {updateBabelPlugin} from '@sewing-kit/plugin-javascript';
import type {} from '@sewing-kit/plugin-rollup';

import type {
  Options as RollupOptions,
  WorkerContext,
  PublicPathContext,
} from './rollup-parts';
import type {Options as BabelOptions} from './babel';
import type {WorkerWrapper} from './types';

interface IncludeDetails {
  readonly task: Task;
  readonly target?: Target<WebApp, BuildWebAppTargetOptions>;
}

interface Options {
  include?(details: IncludeDetails): boolean;
  publicPath?:
    | string
    | Parameters<CustomHooks['quiltWorkerRollupPublicPath']['hook']>[0];
  workerContent?: Parameters<CustomHooks['quiltWorkerContent']['hook']>[0];
  rollupPlugins?:
    | Plugin[]
    | Parameters<CustomHooks['quiltWorkerRollupPlugins']['hook']>[0];
  rollupInputOptions?: Parameters<
    CustomHooks['quiltWorkerRollupInputOptions']['hook']
  >[0];
  rollupOutputOptions?: Parameters<
    CustomHooks['quiltWorkerRollupOutputOptions']['hook']
  >[0];
}

interface CustomHooks {
  readonly quiltWorkerNoop: WaterfallHook<boolean>;
  readonly quiltWorkerWrite: WaterfallHook<boolean>;
  readonly quiltWorkerPackages: WaterfallHook<BabelOptions['packages']>;
  readonly quiltWorkerContent: WaterfallHook<
    string | undefined,
    WorkerWrapper,
    WorkerContext
  >;
  readonly quiltWorkerRollupInputOptions: WaterfallHook<
    InputOptions,
    WorkerContext
  >;
  readonly quiltWorkerRollupOutputOptions: WaterfallHook<
    OutputOptions,
    WorkerContext
  >;
  readonly quiltWorkerRollupPlugins: WaterfallHook<Plugin[], WorkerContext>;
  readonly quiltWorkerRollupPublicPath: WaterfallHook<
    string | undefined,
    PublicPathContext
  >;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
}

export function workers({
  include = () => true,
  publicPath,
  workerContent,
  rollupPlugins: explicitRollupPlugins,
  rollupInputOptions,
  rollupOutputOptions,
}: Options = {}) {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppMagicModules',
    ({project, tasks}) => {
      const addWorkerHooks = addHooks<CustomHooks>(() => ({
        quiltWorkerNoop: new WaterfallHook(),
        quiltWorkerWrite: new WaterfallHook(),
        quiltWorkerPackages: new WaterfallHook(),
        quiltWorkerRollupPlugins: new WaterfallHook(),
        quiltWorkerRollupPublicPath: new WaterfallHook(),
        quiltWorkerRollupInputOptions: new WaterfallHook(),
        quiltWorkerRollupOutputOptions: new WaterfallHook(),
        quiltWorkerContent: new WaterfallHook(),
      }));

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addWorkerHooks);

        hooks.target.hook(({target, hooks}) => {
          if (!include({target, task: Task.Dev})) return;

          hooks.configure.hook(
            addConfiguration({
              noop: target.runtime.includes(Runtime.Node),
            }),
          );
        });
      });

      tasks.dev.hook(({hooks}) => {
        hooks.configureHooks.hook(addWorkerHooks);

        if (!include({task: Task.Build})) return;

        hooks.configure.hook(
          addConfiguration({
            noop: TargetRuntime.fromProject(project).includes(Runtime.Node),
          }),
        );
      });

      function addConfiguration({noop: defaultNoop = false} = {}) {
        return ({
          rollupPlugins,
          babelConfig,
          quiltWorkerNoop,
          quiltWorkerWrite,
          quiltWorkerPackages,
          quiltWorkerRollupPlugins,
          quiltWorkerRollupPublicPath,
          quiltWorkerRollupInputOptions,
          quiltWorkerRollupOutputOptions,
          quiltWorkerContent,
        }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) => {
          if (workerContent) {
            quiltWorkerContent?.hook(workerContent);
          }

          if (explicitRollupPlugins) {
            quiltWorkerRollupPlugins?.hook(
              Array.isArray(explicitRollupPlugins)
                ? () => explicitRollupPlugins
                : explicitRollupPlugins,
            );
          }

          if (rollupInputOptions) {
            quiltWorkerRollupInputOptions?.hook(rollupInputOptions);
          }

          if (rollupOutputOptions) {
            quiltWorkerRollupOutputOptions?.hook(rollupOutputOptions);
          }

          if (publicPath) {
            quiltWorkerRollupPublicPath?.hook(
              typeof publicPath === 'string' ? () => publicPath : publicPath,
            );
          }

          rollupPlugins?.hook(async (plugins) => {
            const [noop, write, {workers}] = await Promise.all([
              quiltWorkerNoop!.run(defaultNoop),
              quiltWorkerWrite!.run(defaultNoop),
              import('./rollup-parts'),
            ]);

            if (noop) return plugins;

            const options: RollupOptions = {
              write,
              contentForWorker: (wrapper, context) =>
                quiltWorkerContent!.run(undefined, wrapper, context),
              plugins: (plugins, context) =>
                quiltWorkerRollupPlugins!.run(plugins, context),
              inputOptions: (inputOptions, context) =>
                quiltWorkerRollupInputOptions!.run(inputOptions, context),
              outputOptions: (outputOptions, context) =>
                quiltWorkerRollupOutputOptions!.run(outputOptions, context),
              publicPath: (context) =>
                quiltWorkerRollupPublicPath!.run(undefined, context),
            };

            return [...plugins, workers(options)];
          });

          babelConfig?.hook(
            updateBabelPlugin(
              '@quilted/workers/babel',
              async (): Promise<Record<string, any>> => {
                const [noop, packages] = await Promise.all([
                  quiltWorkerNoop!.run(defaultNoop),
                  quiltWorkerPackages!.run(undefined),
                ]);

                const options: BabelOptions = {noop, packages};

                return options;
              },
              {addIfMissing: true},
            ),
          );
        };
      }
    },
  );
}
