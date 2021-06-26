import * as path from 'path';
import {spawn} from 'child_process';
import type {ChildProcess} from 'child_process';

import {stripIndent} from 'common-tags';
import {createProjectPlugin, Runtime, TargetRuntime} from '@quilted/sewing-kit';
import type {App, Service, WaterfallHook} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-rollup';

import {getEntry} from './shared';
import {MAGIC_MODULE_HTTP_HANDLER} from '../constants';

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

            plugins.push(
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
          
                    import {createHttpServer} from '@quilted/http-handlers/node';
          
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

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createHttpHandler()`
                  // object as the default export.
                  if (content) return {id, moduleSideEffects: 'no-treeshake'};

                  return {
                    id: await getEntry(project),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                load(id) {
                  if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                  return content!;
                },
              },
            );

            return plugins;
          });
        },
      );
    },
  });
}

export function httpHandlerDevelopment({port: explicitPort}: Options = {}) {
  return createProjectPlugin<App | Service>({
    name: 'Quilt.HttpHandler.Development',
    develop({project, internal, hooks, configure, run}) {
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
            rollupInputOptions,
            rollupPlugins,
            rollupNodeBundle,
            quiltHttpHandlerHost,
            quiltHttpHandlerPort,
            quiltHttpHandlerContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltHttpHandler},
        ) => {
          if (!quiltHttpHandler) return;

          runtime?.(() => new TargetRuntime([Runtime.Node]));

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = false;
            return options;
          });

          // We will let node_modules be imported normally
          rollupNodeBundle?.(() => false);

          rollupPlugins?.(async (plugins) => {
            const content = await quiltHttpHandlerContent!.run(undefined);

            plugins.push(
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
          
                    import {createHttpServer} from '@quilted/http-handlers/node';
          
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
                  if (content) return {id, moduleSideEffects: 'no-treeshake'};

                  return {
                    id: await getEntry(project),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                load(id) {
                  if (id !== MAGIC_MODULE_HTTP_HANDLER) return null;

                  return content!;
                },
              },
            );

            return plugins;
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.HttpHandler.Development',
          label: `Running local development server for ${project.name}`,
          async run() {
            const file = internal.fs.tempPath(
              'quilt-http-handler-dev',
              project.name,
              'built.js',
            );

            const [
              {watch},
              {rollupInput, rollupExternals, rollupPlugins, rollupInputOptions},
            ] = await Promise.all([
              import('rollup'),
              configuration({quiltHttpHandler: true}),
            ]);

            const [input, plugins, external] = await Promise.all([
              rollupInput!.run([]),
              rollupPlugins!.run([]),
              rollupExternals!.run([]),
            ]);

            const [inputOptions] = await Promise.all([
              rollupInputOptions!.run({
                input,
                plugins,
                external,
              }),
            ]);

            if ((inputOptions.input ?? []).length === 0) {
              return;
            }

            let server: ChildProcess | undefined;

            const watcher = watch({
              ...inputOptions,
              output: {
                format: 'esm',
                dir: path.dirname(file),
                entryFileNames: path.basename(file),
              },
            });

            watcher.on('event', (event) => {
              switch (event.code) {
                case 'BUNDLE_START': {
                  try {
                    server?.kill();
                  } catch {
                    // intentional noop
                  }

                  server = spawn('node', [file], {
                    stdio: 'inherit',
                  });
                  break;
                }
                case 'ERROR': {
                  // eslint-disable-next-line no-console
                  console.error(event.error);
                  break;
                }
              }
            });
          },
        }),
      );
    },
  });
}
