import {
  WebApp,
  Target,
  createProjectPlugin,
  Task,
  addHooks,
  WaterfallHook,
  Service,
  Runtime,
  TargetRuntime,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
  BuildServiceTargetOptions,
} from '@sewing-kit/hooks';

import {excludeNonPolyfillEntries} from './shared';

import type {} from './web-app-auto-server';
import {MAGIC_MODULE_HTTP_HANDLER} from './constants';

interface CustomHooks {
  readonly quiltHttpHandlerPort: WaterfallHook<number>;
  readonly quiltHttpHandlerHost: WaterfallHook<string>;
  readonly quiltHttpHandlerContent: WaterfallHook<string | undefined>;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
  interface BuildServiceConfigurationCustomHooks extends CustomHooks {}
  interface DevServiceConfigurationCustomHooks extends CustomHooks {}
}

interface IncludeDetails<ProjectType extends WebApp | Service> {
  readonly task: Task;
  readonly target?: Target<
    ProjectType,
    BuildWebAppTargetOptions | BuildServiceTargetOptions
  >;
}

interface Options<ProjectType extends WebApp | Service> {
  include?(details: IncludeDetails<ProjectType>): boolean;
}

export function httpHandler<ProjectType extends WebApp | Service>({
  include = () => true,
}: Options<ProjectType> = {}) {
  return createProjectPlugin<ProjectType>(
    'Quilt.HttpHandler',
    ({tasks, api, project}) => {
      const entryPath = api.tmpPath(
        `quilt/${project.name}-http-handler-entry.js`,
      );

      function addConfiguration() {
        return ({
          webpackEntries,
          webpackPlugins,
          quiltHttpHandlerHost,
          quiltHttpHandlerPort,
          quiltHttpHandlerContent,
        }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) => {
          webpackEntries?.hook((entries) => [
            ...excludeNonPolyfillEntries(entries),
            entryPath,
          ]);

          webpackPlugins?.hook(async (plugins) => {
            const {default: WebpackVirtualModules} = await import(
              'webpack-virtual-modules'
            );

            const content = await quiltHttpHandlerContent!.run(undefined);

            if (content == null) {
              throw new Error(
                `No http handler content found for project ${project.name}`,
              );
            }

            return [
              ...plugins,
              new WebpackVirtualModules({[entryPath]: content}),
            ];
          });

          quiltHttpHandlerContent!.hook(async (content) => {
            if (content) return content;

            const [port, host] = await Promise.all([
              quiltHttpHandlerPort!.run(3000),
              quiltHttpHandlerHost!.run('localhost'),
            ]);

            return `
              import httpHandler from ${JSON.stringify(
                MAGIC_MODULE_HTTP_HANDLER,
              )};

              import {createHttpServer} from '@quilted/http-handlers/node';

              const port = ${port};
              const host = ${JSON.stringify(host)};

              process.on('uncaughtException', (...args) => {
                console.error(...args);
              });

              console.log('Creating server: http://${host}:${port}');
              
              createHttpServer(httpHandler).listen(port, host, () => {
                console.log('listening on http://${host}:${port}');
              });
            `;
          });
        };
      }

      const addSourceHooks = addHooks<CustomHooks>(() => ({
        quiltHttpHandlerHost: new WaterfallHook(),
        quiltHttpHandlerPort: new WaterfallHook(),
        quiltHttpHandlerContent: new WaterfallHook(),
      }));

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        hooks.target.hook(({target, hooks}) => {
          if (!target.runtime.includes(Runtime.Node)) return;
          if (!include({target: target as any, task: Task.Build})) return;

          hooks.configure.hook(addConfiguration());
        });
      });

      // eslint-disable-next-line no-warning-comments
      // TODO: dev needs targets too!
      tasks.dev.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        if (!TargetRuntime.fromProject(project).includes(Runtime.Node)) return;
        if (!include({task: Task.Dev})) return;

        hooks.configure.hook(addConfiguration());
      });
    },
  );
}
