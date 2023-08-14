import {stripIndent} from 'common-tags';

import {
  createProjectPlugin,
  type WaterfallHook,
  type WaterfallHookWithDefault,
} from '../kit.ts';
import {MAGIC_MODULE_REQUEST_ROUTER} from '../constants.ts';
import {addRollupOnWarn} from '../tools/rollup.ts';

import type {EnvironmentOptions} from './magic-module-env.ts';

const MAGIC_ENTRY_MODULE = '.quilt/magic/request-router-entry.js';
const MAGIC_REQUEST_ROUTER_MODULE_ENTRY = '.quilt/magic/request-router.js';

export interface RequestRouterHooks {
  quiltRequestRouterEntry: WaterfallHook<string>;
  quiltRequestRouterPort: WaterfallHook<number | undefined>;
  quiltRequestRouterHost: WaterfallHook<string | undefined>;
  quiltRequestRouterContent: WaterfallHook<string | undefined>;
  quiltRequestRouterRuntimeContent: WaterfallHook<string | undefined>;
  quiltRequestRouterPackage: WaterfallHookWithDefault<string>;
}

export interface RequestRouterOptions {
  quiltRequestRouter: boolean;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends RequestRouterHooks {}
  interface DevelopProjectConfigurationHooks extends RequestRouterHooks {}

  interface BuildProjectOptions extends RequestRouterOptions {}
  interface DevelopProjectOptions extends RequestRouterOptions {}
}

export interface Options {
  env?: EnvironmentOptions;
  port?: number;
}

export function requestRouter({port: explicitPort}: Omit<Options, 'env'> = {}) {
  return createProjectPlugin({
    name: 'Quilt.RequestRouter',
    build({hooks, configure, project}) {
      hooks<RequestRouterHooks>(({waterfall}) => ({
        quiltRequestRouterEntry: waterfall(),
        quiltRequestRouterPort: waterfall(),
        quiltRequestRouterHost: waterfall(),
        quiltRequestRouterContent: waterfall(),
        quiltRequestRouterRuntimeContent: waterfall(),
        quiltRequestRouterPackage: waterfall<string>({
          default: () =>
            project.hasDependency('@quilted/request-router')
              ? '@quilted/request-router'
              : '@quilted/quilt/request-router',
        }),
      }));

      configure(
        (
          {
            rollupInput,
            rollupInputOptions,
            rollupPlugins,
            quiltRequestRouterEntry,
            quiltRequestRouterHost,
            quiltRequestRouterPort,
            quiltRequestRouterContent,
            quiltRequestRouterRuntimeContent,
            quiltRequestRouterPackage,
          },
          {quiltRequestRouter = false},
        ) => {
          if (!quiltRequestRouter) return;

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
            const content = await quiltRequestRouterContent!.run(undefined);

            return [
              {
                name: '@quilted/request-router/magic-entry',
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

                  const content = await quiltRequestRouterRuntimeContent!.run(
                    undefined,
                  );

                  if (content) return content;

                  const [port, host] = await Promise.all([
                    quiltRequestRouterPort!.run(explicitPort),
                    quiltRequestRouterHost!.run(undefined),
                  ]);

                  return stripIndent`
                    import requestRouter from ${JSON.stringify(
                      MAGIC_MODULE_REQUEST_ROUTER,
                    )};
          
                    import {createHttpServer} from '${await quiltRequestRouterPackage!.run()}/node';
          
                    const port = ${
                      port ?? 'Number.parseInt(process.env.PORT, 10)'
                    };
                    const host = ${
                      host ? JSON.stringify(host) : 'process.env.HOST'
                    };
                  
                    createHttpServer(requestRouter).listen(port, host);
                  `;
                },
              },
              {
                name: '@quilted/request-router/magic-module',
                async resolveId(id) {
                  if (id !== MAGIC_MODULE_REQUEST_ROUTER) return null;

                  return {
                    id: project.fs.resolvePath(
                      MAGIC_REQUEST_ROUTER_MODULE_ENTRY,
                    ),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                async load(id) {
                  if (
                    id !==
                    project.fs.resolvePath(MAGIC_REQUEST_ROUTER_MODULE_ENTRY)
                  ) {
                    return null;
                  }

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createRequestRouter()`
                  // object as the default export.
                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      await quiltRequestRouterEntry!.run(
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

export function requestRouterDevelopment({
  port: explicitPort,
  env,
}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.RequestRouter.Development',
    develop({project, hooks, configure}) {
      hooks<RequestRouterHooks>(({waterfall}) => ({
        quiltRequestRouterEntry: waterfall(),
        quiltRequestRouterPort: waterfall(),
        quiltRequestRouterHost: waterfall(),
        quiltRequestRouterContent: waterfall(),
        quiltRequestRouterRuntimeContent: waterfall(),
        quiltRequestRouterPackage: waterfall<string>({
          default: () =>
            project.hasDependency('@quilted/request-router')
              ? '@quilted/request-router'
              : '@quilted/quilt/request-router',
        }),
      }));

      configure(
        (
          {
            rollupInput,
            rollupPlugins,
            rollupInputOptions,
            quiltRequestRouterEntry,
            quiltRequestRouterHost,
            quiltRequestRouterPort,
            quiltRequestRouterContent,
            quiltRequestRouterPackage,
            quiltRequestRouterRuntimeContent,
            quiltInlineEnvironmentVariables,
            quiltRuntimeEnvironmentVariables,
          },
          {quiltRequestRouter},
        ) => {
          if (!quiltRequestRouter) return;

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
            const content = await quiltRequestRouterContent!.run(undefined);

            return [
              {
                name: '@quilted/request-router/magic-entry',
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

                  const content = await quiltRequestRouterRuntimeContent!.run(
                    undefined,
                  );

                  if (content) return content;

                  const {default: getPort} = await import('get-port');

                  const [port, host] = await Promise.all([
                    quiltRequestRouterPort!.run(
                      await getPort({port: explicitPort}),
                    ),
                    quiltRequestRouterHost!.run(undefined),
                  ]);

                  return stripIndent`
                    import requestRouter from ${JSON.stringify(
                      MAGIC_MODULE_REQUEST_ROUTER,
                    )};
          
                    import {createHttpServer} from '${await quiltRequestRouterPackage!.run()}/node';
          
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

                    createHttpServer(requestRouter).listen(port, host, () => {
                      console.log(\`${
                        project.name
                      } is listening for requests on http://\${host}:\${port}\`);
                    });
                  `;
                },
              },
              {
                name: '@quilted/request-router/magic-module',
                async resolveId(id) {
                  if (id !== MAGIC_MODULE_REQUEST_ROUTER) return null;

                  return {
                    id: project.fs.resolvePath(
                      MAGIC_REQUEST_ROUTER_MODULE_ENTRY,
                    ),
                    moduleSideEffects: 'no-treeshake',
                  };
                },
                async load(id) {
                  if (
                    id !==
                    project.fs.resolvePath(MAGIC_REQUEST_ROUTER_MODULE_ENTRY)
                  ) {
                    return null;
                  }

                  // If we were given content, we will use that as the content
                  // for the entry. Otherwise, just point to the project’s entry,
                  // which is assumed to be a module that exports a `createRequestRouter()`
                  // object as the default export.
                  return (
                    content ??
                    `export {default} from ${JSON.stringify(
                      await quiltRequestRouterEntry!.run(
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
