import {stripIndent} from 'common-tags';
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
  Step,
  createProjectDevPlugin,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
  BuildServiceTargetOptions,
} from '@sewing-kit/hooks';
import type {} from '@sewing-kit/plugin-rollup';

import {MAGIC_MODULE_HTTP_HANDLER} from './constants';

const MAGIC_ENTRY_MODULE = '__quilt__/HttpHandlerEntry.tsx';

interface CustomHooks {
  readonly quiltHttpHandlerPort: WaterfallHook<number | undefined>;
  readonly quiltHttpHandlerHost: WaterfallHook<string | undefined>;
  readonly quiltHttpHandlerContent: WaterfallHook<string | undefined>;
  readonly quiltHttpHandlerRuntimeContent: WaterfallHook<string | undefined>;
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

export interface Options<ProjectType extends WebApp | Service> {
  port?: number;
  include?(details: IncludeDetails<ProjectType>): boolean;
}

export function httpHandler<ProjectType extends WebApp | Service>({
  port: explicitPort,
  include = () => true,
}: Options<ProjectType> = {}) {
  return createProjectPlugin<ProjectType>(
    'Quilt.HttpHandler',
    ({tasks, project}) => {
      function addDefaultConfiguration({
        rollupInput,
        rollupPlugins,
        quiltHttpHandlerHost,
        quiltHttpHandlerPort,
        quiltHttpHandlerContent,
        quiltHttpHandlerRuntimeContent,
      }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) {
        quiltHttpHandlerRuntimeContent!.hook(async (content) => {
          if (content) return content;

          const [port, host] = await Promise.all([
            quiltHttpHandlerPort!.run(explicitPort),
            quiltHttpHandlerHost!.run(undefined),
          ]);

          return stripIndent`
            import httpHandler from ${JSON.stringify(
              MAGIC_MODULE_HTTP_HANDLER,
            )};
  
            import {createHttpServer} from '@quilted/http-handlers/node';
  
            const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
            const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};
  
            process.on('uncaughtException', (...args) => {
              console.error(...args);
            });
  
            console.log('Creating server: http://${host}:${port}');
            
            createHttpServer(httpHandler).listen(port, host, () => {
              console.log('listening on http://${host}:${port}');
            });
          `;
        });

        rollupInput?.hook(() => [MAGIC_ENTRY_MODULE]);
        rollupPlugins?.hook(async (plugins) => {
          const content = await quiltHttpHandlerContent!.run(undefined);

          return [
            ...plugins,
            {
              name: '@quilted/http-handler/magic-entry',
              resolveId(id) {
                if (id !== MAGIC_ENTRY_MODULE) return null;
                return id;
              },
              async load(source) {
                if (source !== MAGIC_ENTRY_MODULE) return null;

                const content = await quiltHttpHandlerRuntimeContent!.run(
                  undefined,
                );

                if (content == null) {
                  throw new Error(
                    `No http handler content found for project ${project.name}`,
                  );
                }

                return content;
              },
            },
            {
              name: '@quilted/http-handler/magic-module',
              async resolveId(id) {
                if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                // If we were given content, we will use that as the content
                // for the entry. Otherwise, just point to the project’s entry,
                // which is assumed to be a module that exports a `createHttpHandler()`
                // object as the default export.
                return content
                  ? id
                  : project.fs.resolvePath(project.entry ?? 'index');
              },
              load(id) {
                if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                return content!;
              },
            },
          ];
        });
      }

      const addSourceHooks = addHooks<CustomHooks>(() => ({
        quiltHttpHandlerHost: new WaterfallHook(),
        quiltHttpHandlerPort: new WaterfallHook(),
        quiltHttpHandlerContent: new WaterfallHook(),
        quiltHttpHandlerRuntimeContent: new WaterfallHook(),
      }));

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        hooks.target.hook(({target, hooks}) => {
          if (!target.runtime.includes(Runtime.Node)) return;
          if (!include({target: target as any, task: Task.Build})) return;

          hooks.configure.hook(addDefaultConfiguration);
        });
      });

      // eslint-disable-next-line no-warning-comments
      // TODO: dev needs targets too!
      tasks.dev.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        if (!TargetRuntime.fromProject(project).includes(Runtime.Node)) return;
        if (!include({task: Task.Dev})) return;

        hooks.configure.hook(addDefaultConfiguration);
      });
    },
  );
}

export function httpHandlerDevelopment<ProjectType extends WebApp | Service>({
  port: explicitPort,
}: Pick<Options<ProjectType>, 'port'> = {}) {
  return createProjectDevPlugin<ProjectType>(
    'Quilt.HttpHandler.Development',
    ({hooks, project, api}) => {
      if (!TargetRuntime.fromProject(project).includes(Runtime.Node)) return;

      hooks.configure.hook(
        ({quiltAutoServerPort}: DevWebAppConfigurationHooks) => {
          if (explicitPort) quiltAutoServerPort?.hook(() => explicitPort);
        },
      );

      hooks.steps.hook((steps: readonly Step[]) => [
        ...steps,
        api.createStep(
          {
            id: 'Quilt.HttpHandler.Development',
            label: `Running local development server for ${project.name}`,
          },
          (step) => {
            const file = api.tmpPath(
              'quilt-http-handler-dev',
              project.name,
              'built.js',
            );

            let server: ReturnType<typeof step['exec']> | undefined;

            // eslint-disable-next-line prefer-const
            server = step.exec('node', [file], {stdio: 'inherit'});

            // eslint-disable-next-line no-console
            console.log(server);
          },
        ),
      ]);
    },
  );
}
