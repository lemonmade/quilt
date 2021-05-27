import {
  createProjectPlugin,
  WebApp,
  TargetBuilder,
  TargetRuntime,
  Runtime,
  WaterfallHook,
  addHooks,
} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-rollup';

import type {} from './http-handler';

interface TargetOptions {
  readonly quiltAutoServer?: true;
}

interface CustomHooks {
  readonly quiltAutoServerContent: WaterfallHook<string | undefined>;
  readonly quiltAutoServerPort: WaterfallHook<number>;
  readonly quiltAutoServerHost: WaterfallHook<string>;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppTargetOptions extends TargetOptions {}
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
}

interface Options {
  readonly port?: number;
  readonly host?: string;
}

export function webAppAutoServer({
  host: defaultHost,
  port: defaultPort,
}: Options = {}) {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppAutoServer',
    ({project, workspace, tasks}) => {
      const addCustomHooks = addHooks<CustomHooks>(() => ({
        quiltAutoServerContent: new WaterfallHook(),
        quiltAutoServerPort: new WaterfallHook(),
        quiltAutoServerHost: new WaterfallHook(),
      }));

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addCustomHooks);

        hooks.targets.hook((targets) => [
          ...targets,
          new TargetBuilder({
            project,
            options: [{quiltAutoServer: true}],
            runtime: new TargetRuntime([Runtime.Node]),
            needs: targets.filter((target) => target.default),
          }),
        ]);

        hooks.target.hook(({target, hooks}) => {
          if (!target.options.quiltAutoServer) return;

          hooks.configure.hook(
            ({
              rollupOutputs,
              rollupInputOptions,
              quiltAutoServerHost,
              quiltAutoServerPort,
              quiltAutoServerContent,
              quiltHttpHandlerHost,
              quiltHttpHandlerPort,
              quiltHttpHandlerContent,
            }) => {
              if (defaultHost) {
                quiltAutoServerHost!.hook(() => defaultHost);
              }

              if (defaultPort) {
                quiltAutoServerPort!.hook(() => defaultPort);
              }

              quiltHttpHandlerHost?.hook(async () =>
                quiltAutoServerHost!.run('localhost'),
              );

              quiltHttpHandlerPort?.hook(async () =>
                quiltAutoServerPort!.run(3003),
              );

              quiltHttpHandlerContent?.hook(
                async () =>
                  (await quiltAutoServerContent!.run(undefined)) ??
                  `export {default} from '@quilted/quilt/magic-app-http-handler';`,
              );

              rollupInputOptions?.hook((options) => ({
                ...options,
                preserveEntrySignatures: 'exports-only',
              }));

              rollupOutputs?.hook(() => [
                {
                  format: 'commonjs',
                  entryFileNames: 'index.js',
                  exports: 'named',
                  esModule: false,
                  dir: workspace.fs.buildPath(
                    workspace.webApps.length > 1
                      ? `apps/${project.name}`
                      : 'app',
                    'server',
                  ),
                },
              ]);
            },
          );
        });
      });
    },
  );
}
