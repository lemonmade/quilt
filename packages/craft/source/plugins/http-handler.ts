import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '../kit';
import type {WaterfallHook} from '../kit';
import {MAGIC_MODULE_HTTP_HANDLER} from '../constants';
import {addRollupOnWarn} from '../tools/rollup';

import type {EnvironmentOptions} from './magic-module-env';

const MAGIC_ENTRY_MODULE = '.quilt/magic/http-handler-entry.js';
const MAGIC_HTTP_HANDLER_MODULE_ENTRY = '.quilt/magic/http-handler.js';

export interface HttpHandlerHooks {
  quiltHttpHandlerEntry: WaterfallHook<string>;
  quiltHttpHandlerPort: WaterfallHook<number | undefined>;
  quiltHttpHandlerHost: WaterfallHook<string | undefined>;
  quiltHttpHandlerContent: WaterfallHook<string | undefined>;
  quiltHttpHandlerRuntimeContent: WaterfallHook<string | undefined>;
}

export interface HttpHandlerOptions {
  quiltHttpHandler: boolean;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends HttpHandlerHooks {}
  interface DevelopProjectConfigurationHooks extends HttpHandlerHooks {}

  interface BuildProjectOptions extends HttpHandlerOptions {}
  interface DevelopProjectOptions extends HttpHandlerOptions {}
}

export interface Options {
  env?: EnvironmentOptions;
  port?: number;
}

export function httpHandler({port: explicitPort}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.HttpHandler',
    build({hooks, configure, project}) {
      hooks<HttpHandlerHooks>(({waterfall}) => ({
        quiltHttpHandlerEntry: waterfall(),
        quiltHttpHandlerPort: waterfall(),
        quiltHttpHandlerHost: waterfall(),
        quiltHttpHandlerContent: waterfall(),
        quiltHttpHandlerRuntimeContent: waterfall(),
      }));

      configure(
        (
          {
            rollupInput,
            rollupInputOptions,
            rollupPlugins,
            quiltHttpHandlerEntry,
            quiltHttpHandlerHost,
            quiltHttpHandlerPort,
            quiltHttpHandlerContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltHttpHandler = false},
        ) => {
          if (!quiltHttpHandler) return;

          // We resolve to a path within the project’s directory
          // so that it can use the app’s node_modules.
          rollupInput?.(() => [project.fs.resolvePath(MAGIC_ENTRY_MODULE)]);

          // Some of our Node dependencies have an older `depd` as a dependency, which
          // uses `eval()`. It’s not actually an issue, in practice.
          rollupInputOptions?.((options) =>
            addRollupOnWarn(options, (warning, defaultWarn) => {
              if (
                warning.code === 'EVAL' &&
                (warning.id?.includes('node_modules/depd') ?? false)
              ) {
                return;
              }

              // This warning complains about arrow functions at the top-level scope
              // of a module.
              if (warning.code === 'THIS_IS_UNDEFINED') return;

              defaultWarn(warning);
            }),
          );

          rollupPlugins?.(async (plugins) => {
            const content = await quiltHttpHandlerContent!.run(undefined);

            return [
              {
                name: '@quilted/http-handler/magic-entry',
                resolveId(id) {
                  if (id !== project.fs.resolvePath(MAGIC_ENTRY_MODULE))
                    return null;

                  return {
                    id,
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

                  return {
                    id: project.fs.resolvePath(MAGIC_HTTP_HANDLER_MODULE_ENTRY),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                async load(id) {
                  if (
                    id !==
                    project.fs.resolvePath(MAGIC_HTTP_HANDLER_MODULE_ENTRY)
                  ) {
                    return null;
                  }

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createHttpHandler()`
                  // object as the default export.
                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      await quiltHttpHandlerEntry!.run(
                        project.fs.resolvePath('index'),
                      ),
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
  return createProjectPlugin({
    name: 'Quilt.HttpHandler.Development',
    develop({project, hooks, configure}) {
      hooks<HttpHandlerHooks>(({waterfall}) => ({
        quiltHttpHandlerEntry: waterfall(),
        quiltHttpHandlerPort: waterfall(),
        quiltHttpHandlerHost: waterfall(),
        quiltHttpHandlerContent: waterfall(),
        quiltHttpHandlerRuntimeContent: waterfall(),
      }));

      configure(
        (
          {
            rollupInput,
            rollupPlugins,
            rollupInputOptions,
            quiltHttpHandlerEntry,
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

          rollupInput?.(() => [project.fs.resolvePath(MAGIC_ENTRY_MODULE)]);

          // Some of our Node dependencies have an older `depd` as a dependency, which
          // uses `eval()`. It’s not actually an issue, in practice.
          rollupInputOptions?.((options) =>
            addRollupOnWarn(options, (warning, defaultWarn) => {
              if (
                warning.code === 'EVAL' &&
                (warning.id?.includes('node_modules/depd') ?? false)
              ) {
                return;
              }

              // This warning complains about arrow functions at the top-level scope
              // of a module.
              if (warning.code === 'THIS_IS_UNDEFINED') return;

              defaultWarn(warning);
            }),
          );

          rollupPlugins?.(async (plugins) => {
            const content = await quiltHttpHandlerContent!.run(undefined);

            return [
              {
                name: '@quilted/http-handler/magic-entry',
                resolveId(id) {
                  if (id !== project.fs.resolvePath(MAGIC_ENTRY_MODULE)) {
                    return null;
                  }

                  return {id, moduleSideEffects: 'no-treeshake'};
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

                  return {
                    id: project.fs.resolvePath(MAGIC_HTTP_HANDLER_MODULE_ENTRY),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                async load(id) {
                  if (
                    id !==
                    project.fs.resolvePath(MAGIC_HTTP_HANDLER_MODULE_ENTRY)
                  ) {
                    return null;
                  }

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createHttpHandler()`
                  // object as the default export.
                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      await quiltHttpHandlerEntry!.run(
                        project.fs.resolvePath('index'),
                      ),
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
