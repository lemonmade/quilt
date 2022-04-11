import {stripIndent} from 'common-tags';

import {createProjectPlugin, Runtime, TargetRuntime} from '../kit';
import type {App, Service, WaterfallHook} from '../kit';
import {MAGIC_MODULE_HTTP_HANDLER} from '../constants';

import type {} from '../tools/rollup';

import type {EnvironmentOptions} from './magic-module-env';

const MAGIC_ENTRY_MODULE = '__quilt__/HttpHandlerEntry.tsx';

export interface HttpHandlerHooks {
  quiltHttpHandlerPort: WaterfallHook<number | undefined>;
  quiltHttpHandlerHost: WaterfallHook<string | undefined>;
  quiltHttpHandlerContent: WaterfallHook<string | undefined>;
  quiltHttpHandlerRuntimeContent: WaterfallHook<string | undefined>;
}

export interface HttpHandlerOptions {
  quiltHttpHandler: boolean;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends HttpHandlerHooks {}
  interface DevelopAppConfigurationHooks extends HttpHandlerHooks {}
  interface BuildServiceConfigurationHooks extends HttpHandlerHooks {}
  interface DevelopServiceConfigurationHooks extends HttpHandlerHooks {}

  interface BuildAppOptions extends HttpHandlerOptions {}
  interface DevelopAppOptions extends HttpHandlerOptions {}
  interface BuildServiceOptions extends HttpHandlerOptions {}
  interface DevelopServiceOptions extends HttpHandlerOptions {}
}

export interface Options {
  env?: EnvironmentOptions;
  port?: number;
}

export function httpHandler({port: explicitPort}: Options = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.HttpHandler',
    build({hooks, configure, project}) {
      hooks<HttpHandlerHooks>(({waterfall}) => ({
        quiltHttpHandlerPort: waterfall(),
        quiltHttpHandlerHost: waterfall(),
        quiltHttpHandlerContent: waterfall(),
        quiltHttpHandlerRuntimeContent: waterfall(),
      }));

      configure(
        (
          {
            runtime,
            rollupInput,
            rollupPlugins,
            quiltHttpHandlerHost,
            quiltHttpHandlerPort,
            quiltHttpHandlerContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltHttpHandler = false},
        ) => {
          if (!quiltHttpHandler) return;

          runtime(() => new TargetRuntime([Runtime.Node]));

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          rollupPlugins?.(async (plugins) => {
            const content = await quiltHttpHandlerContent!.run(undefined);

            return [
              {
                name: '@quilted/http-handler/magic-entry',
                resolveId(id) {
                  if (id !== MAGIC_ENTRY_MODULE) return null;

                  // We resolve to a path within the project’s directory
                  // so that it can use the app’s node_modules.
                  return {
                    id: project.fs.resolvePath(id),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                async load(source) {
                  if (source !== project.fs.resolvePath(MAGIC_ENTRY_MODULE)) {
                    return null;
                  }

                  const content = await quiltHttpHandlerRuntimeContent!.run(
                    undefined,
                  );

                  if (content) return content;

                  const [port, host] = await Promise.all([
                    quiltHttpHandlerPort!.run(explicitPort),
                    quiltHttpHandlerHost!.run(undefined),
                  ]);

                  return stripIndent`
                    import httpHandler from ${JSON.stringify(
                      MAGIC_MODULE_HTTP_HANDLER,
                    )};
          
                    import {createHttpServer} from '@quilted/quilt/http-handlers/node';
          
                    const port = ${
                      port ?? 'Number.parseInt(process.env.PORT, 10)'
                    };
                    const host = ${
                      host ? JSON.stringify(host) : 'process.env.HOST'
                    };
                  
                    createHttpServer(httpHandler).listen(port, host);
                  `;
                },
              },
              {
                name: '@quilted/http-handler/magic-module',
                async resolveId(id) {
                  if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                  return id;
                },
                load(id) {
                  if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createHttpHandler()`
                  // object as the default export.
                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      project.fs.resolvePath(project.entry ?? 'index'),
                    )}`
                  );
                },
              },
              ...plugins,
            ];
          });
        },
      );
    },
  });
}

export function httpHandlerDevelopment({
  port: explicitPort,
  env,
}: Options = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.HttpHandler.Development',
    develop({project, hooks, configure}) {
      hooks<HttpHandlerHooks>(({waterfall}) => ({
        quiltHttpHandlerPort: waterfall(),
        quiltHttpHandlerHost: waterfall(),
        quiltHttpHandlerContent: waterfall(),
        quiltHttpHandlerRuntimeContent: waterfall(),
      }));

      configure(
        (
          {
            runtime,
            rollupInput,
            rollupPlugins,
            rollupNodeBundle,
            quiltHttpHandlerHost,
            quiltHttpHandlerPort,
            quiltHttpHandlerContent,
            quiltHttpHandlerRuntimeContent,
            quiltInlineEnvironmentVariables,
            quiltRuntimeEnvironmentVariables,
          },
          {quiltHttpHandler},
        ) => {
          if (!quiltHttpHandler) return;

          const inlineEnv = env?.inline;

          if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          quiltRuntimeEnvironmentVariables?.(
            (runtime) => runtime ?? 'process.env',
          );

          runtime?.(() => new TargetRuntime([Runtime.Node]));

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          // We want to force some of our “magic” modules to be internalized
          // no matter what, and otherwise allow all other node dependencies
          // to be unbundled.
          rollupNodeBundle?.((bundle) => {
            const {include = [], exclude = []} =
              typeof bundle === 'object' ? bundle : {};

            return {
              builtins: false,
              dependencies: false,
              devDependencies: false,
              peerDependencies: false,
              include: [...include, /@quilted[/]quilt[/](magic|env|polyfills)/],
              exclude,
            };
          });

          rollupPlugins?.(async (plugins) => {
            const content = await quiltHttpHandlerContent!.run(undefined);

            return [
              {
                name: '@quilted/http-handler/magic-entry',
                resolveId(id) {
                  if (id !== MAGIC_ENTRY_MODULE) return null;
                  return {id, moduleSideEffects: 'no-treeshake'};
                },
                async load(source) {
                  if (source !== MAGIC_ENTRY_MODULE) return null;

                  const content = await quiltHttpHandlerRuntimeContent!.run(
                    undefined,
                  );

                  if (content) return content;

                  const [port, host] = await Promise.all([
                    quiltHttpHandlerPort!.run(explicitPort),
                    quiltHttpHandlerHost!.run(undefined),
                  ]);

                  return stripIndent`
                    import httpHandler from ${JSON.stringify(
                      MAGIC_MODULE_HTTP_HANDLER,
                    )};
          
                    import {createHttpServer} from '@quilted/quilt/http-handlers/node';
          
                    const port = ${
                      port ?? 'Number.parseInt(process.env.PORT, 10)'
                    };
                    const host = ${
                      host
                        ? JSON.stringify(host)
                        : `process.env.HOST || 'localhost'`
                    };

                    process.on('uncaughtException', (...args) => {
                      console.error(...args);
                    });

                    createHttpServer(httpHandler).listen(port, host, () => {
                      console.log(\`${
                        project.name
                      } is listening for requests on http://\${host}:\${port}\`);
                    });
                  `;
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
                  return {id, moduleSideEffects: 'no-treeshake'};
                },
                load(id) {
                  if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      project.fs.resolvePath(project.entry ?? 'index'),
                    )}`
                  );
                },
              },
              ...plugins,
            ];
          });
        },
      );
    },
  });
}
