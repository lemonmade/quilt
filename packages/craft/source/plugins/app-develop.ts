import * as path from 'path';
import {createRequire} from 'module';
import type {IncomingMessage, ServerResponse} from 'http';

import {stripIndent} from 'common-tags';
import type {ViteDevServer} from 'vite';

import type {} from '../tools/babel';
import {createViteConfig} from '../tools/vite';

import {createProjectPlugin, DiagnosticError} from '../kit';
import type {
  Project,
  WaterfallHook,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit';

import type {AppServerOptions} from './app-server-base';
import type {AppBrowserOptions} from './app-build';
import type {EnvironmentOptions} from './magic-module-env';

import {
  MAGIC_MODULE_REQUEST_ROUTER,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from '../constants';

export const STEP_NAME = 'Quilt.App.Develop';
const MAGIC_MODULE_BROWSER_ENTRY = '.quilt/magic/browser.js';
const MAGIC_MODULE_SERVER_ENTRY = '.quilt/magic/server.js';
const MAGIC_MODULE_ASSET_MANIFEST_ENTRY = '.quilt/magic/asset-manifest';
const ENTRY_EXTENSIONS = ['mjs', 'js', 'jsx', 'ts', 'tsx'];

export interface Options {
  env?: EnvironmentOptions;
  port?: number;
  server?: Pick<AppServerOptions, 'entry' | 'format' | 'env'>;
  browser?: Pick<AppBrowserOptions, 'entryModule' | 'initializeModule'>;
}

export interface AppDevelopmentServerHandler {
  fetch(
    request: Request,
    nodeRequest: IncomingMessage,
  ): Promise<Response | undefined>;
}

export interface AppDevelopmentServer {
  rebuild(entry: string): Promise<AppDevelopmentServerHandler>;
}

export interface AppDevelopmentServerConfigurationHooks {
  /**
   * Indicates that the app server build is being generated by Quilt.
   */
  readonly quiltAppDevelopmentServer: WaterfallHook<AppDevelopmentServer>;
}

declare module '@quilted/sewing-kit' {
  interface DevelopProjectConfigurationHooks
    extends AppDevelopmentServerConfigurationHooks {}
}

const require = createRequire(import.meta.url);

export function appDevelop({env, port, browser, server}: Options = {}) {
  const serverEntry = server?.entry;
  const requestRouter = server?.format ?? 'request-router';
  const serverInlineEnv = server?.env?.inline;

  return createProjectPlugin({
    name: STEP_NAME,
    develop({hooks, project, workspace, configure, run}) {
      hooks<AppDevelopmentServerConfigurationHooks>(({waterfall}) => ({
        quiltAppDevelopmentServer: waterfall(),
      }));

      configure(
        (
          {
            runtimes,
            babelPlugins,
            babelPresets,
            babelExtensions,
            viteConfig,
            vitePort,
            viteHost,
            vitePlugins,
            viteRollupOptions,
            viteServerOptions,
            viteOptimizeDepsExclude,
            rollupPlugins,
            postcssPresetEnvOptions,
            quiltAppEntry,
            quiltAppServerHost,
            quiltAppServerPort,
            quiltAppServerEntryContent,
            quiltAppBrowserEntryContent,
            quiltAppBrowserEntryCssSelector,
            quiltAppBrowserEntryShouldHydrate,
            quiltInlineEnvironmentVariables,
            quiltRuntimeEnvironmentVariables,
            quiltEnvModuleContent,
            quiltRequestRouterRuntimeContent,
          },
          {quiltRequestRouter = false, quiltAppServer = false},
        ) => {
          runtimes(() => [{target: quiltAppServer ? 'node' : 'browser'}]);

          const inlineEnv = env?.inline;

          if (
            quiltRequestRouter &&
            serverInlineEnv != null &&
            serverInlineEnv.length > 0
          ) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(
                new Set([
                  ...variables,
                  ...(inlineEnv ?? []),
                  ...serverInlineEnv,
                ]),
              ),
            );
          } else if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          viteConfig?.((options) => {
            return {
              ...options,
              appType: 'custom',
              esbuild: {...options.esbuild, jsx: 'automatic'},
            };
          });

          viteServerOptions?.((options) => {
            return {...options, middlewareMode: true};
          });

          rollupPlugins?.((plugins) => {
            return [
              {
                name: '@quilted/magic-module/app/server-entry',
                async resolveId(id) {
                  if (
                    id !== project.fs.resolvePath(MAGIC_MODULE_SERVER_ENTRY)
                  ) {
                    return null;
                  }

                  return {id, moduleSideEffects: 'no-treeshake'};
                },
                async load(source) {
                  if (
                    source !== project.fs.resolvePath(MAGIC_MODULE_SERVER_ENTRY)
                  )
                    return null;

                  const baseContent =
                    requestRouter && serverEntry
                      ? stripIndent`
                      export {default} from ${JSON.stringify(
                        project.fs.resolvePath(serverEntry),
                      )};
                    `
                      : stripIndent`
                      import App from ${JSON.stringify(
                        MAGIC_MODULE_APP_COMPONENT,
                      )};
                      import createAssetManifest from ${JSON.stringify(
                        MAGIC_MODULE_APP_ASSET_MANIFEST,
                      )};
                      import {createServerRenderingRequestRouter} from '@quilted/quilt/server';
      
                      export default createServerRenderingRequestRouter(() => <App />, {
                        assets: createAssetManifest(),
                      });
                    `;

                  return quiltAppServerEntryContent!.run(baseContent);
                },
              },
              {
                name: '@quilted/magic-module/app/asset-loader',
                async resolveId(id) {
                  if (id !== MAGIC_MODULE_APP_ASSET_MANIFEST) return null;

                  return project.fs.resolvePath(
                    MAGIC_MODULE_ASSET_MANIFEST_ENTRY,
                  );
                },
                async load(source) {
                  if (
                    source !==
                    project.fs.resolvePath(MAGIC_MODULE_ASSET_MANIFEST_ENTRY)
                  ) {
                    return null;
                  }

                  return stripIndent`
                  import {createAssetManifest} from '@quilted/quilt/server';

                  export default function createManifest() {
                    return createAssetManifest({
                      getBuild() {
                        return ${JSON.stringify({
                          metadata: {
                            priority: 0,
                            modules: true,
                          },
                          entry: {
                            scripts: [
                              {
                                source: `/${MAGIC_MODULE_BROWSER_ENTRY}`,
                                attributes: {
                                  type: 'module',
                                },
                              },
                            ],
                            styles: [],
                          },
                        })};
                      },
                    })
                  }
                `;
                },
              },
              ...plugins,
            ];
          });

          quiltRequestRouterRuntimeContent?.(async () => {
            return stripIndent`
              export {default} from ${JSON.stringify(
                MAGIC_MODULE_REQUEST_ROUTER,
              )};
            `;
          });

          postcssPresetEnvOptions?.((options) => ({
            ...options,
            features: {
              ...options.features,
              'nesting-rules': true,
            },
          }));

          viteRollupOptions?.(async (options) => {
            if (options.input) return options;

            const entryFiles = await Promise.all([
              quiltAppEntry!.run(),
              browser?.entryModule
                ? resolveToActualFiles(browser.entryModule)
                : Promise.resolve([]),
              browser?.initializeModule
                ? resolveToActualFiles(browser.initializeModule)
                : Promise.resolve([]),
            ]);

            return {
              ...options,
              input: entryFiles.flat(),
            };

            async function resolveToActualFiles(specifier: string) {
              if (
                ENTRY_EXTENSIONS.some((extension) =>
                  specifier.endsWith(`.${extension}`),
                )
              ) {
                return [project.fs.resolvePath(specifier)];
              }

              const matchedAsFiles = await project.fs.glob(
                `${specifier}.{${ENTRY_EXTENSIONS.join(',')}}`,
              );

              if (matchedAsFiles.length > 0) {
                return matchedAsFiles;
              }

              const matchedAsDirectory = await project.fs.glob(
                `${specifier}/index.{${ENTRY_EXTENSIONS.join(',')}}`,
              );

              return matchedAsDirectory;
            }
          });

          vitePort?.((existingPort) =>
            quiltAppServerPort!.run(port ?? existingPort),
          );

          viteHost?.((host) => quiltAppServerHost!.run(host));

          viteOptimizeDepsExclude?.((excluded) => [
            ...excluded,
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            'preact',
            'preact/compat',
            'preact/hooks',
            '@quilted/quilt/env',
            '@quilted/quilt/global',
          ]);

          vitePlugins?.(async (plugins) => {
            const [
              {default: prefresh},
              {magicBrowserEntry},
              {magicModuleEnv},
              requestedBabelPlugins,
              requestedBabelPresets,
            ] = await Promise.all([
              import('@prefresh/vite'),
              import('./rollup/magic-browser-entry'),
              import('./rollup/magic-module-env'),
              babelPlugins!.run([]),
              babelPresets!.run([]),
            ]);

            plugins.unshift({
              enforce: 'pre',
              ...magicModuleEnv({
                mode: 'development',
                project,
                workspace,
                inline: () => quiltInlineEnvironmentVariables!.run([]),
                runtime: () => quiltRuntimeEnvironmentVariables!.run(undefined),
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
            });

            plugins.unshift({
              ...magicBrowserEntry({
                ...browser,
                project,
                module: MAGIC_MODULE_BROWSER_ENTRY,
                cssSelector: () => quiltAppBrowserEntryCssSelector!.run(),
                shouldHydrate: () => quiltAppBrowserEntryShouldHydrate!.run(),
                customizeContent: (content) =>
                  quiltAppBrowserEntryContent!.run(content),
              }),
              enforce: 'pre',
            });

            const normalizedBabelPlugins = requestedBabelPlugins;
            const normalizedBabelPresets: typeof requestedBabelPresets = [];

            for (const requestedPreset of requestedBabelPresets) {
              // Omit preset-env and preset-react entirely, Vite handles that with esbuild
              if (
                babelConfigItemIs(requestedPreset, '@babel/preset-env') ||
                babelConfigItemIs(requestedPreset, '@babel/preset-react')
              ) {
                continue;
              }

              // Instead of compiling TypeScript away entirely, we will just teach Babel
              // to parse the syntax by adding the syntax plugin, but only if other plugins
              // are needed.
              if (
                babelConfigItemIs(requestedPreset, '@babel/preset-typescript')
              ) {
                continue;
              }

              normalizedBabelPresets.push(requestedPreset);
            }

            if (
              normalizedBabelPresets.length > 0 ||
              normalizedBabelPlugins.length > 0
            ) {
              const extensions = await babelExtensions!.run([
                '.ts',
                '.tsx',
                '.mjs',
                '.js',
              ]);

              const finalPlugins = [
                [
                  require.resolve('@babel/plugin-syntax-typescript'),
                  {isTSX: true},
                ],
                ...normalizedBabelPlugins,
              ];

              plugins.push({
                name: '@quilted/babel-preprocess',
                enforce: 'pre',
                async transform(code, id) {
                  if (!extensions.some((ext) => id.endsWith(ext))) {
                    return null;
                  }

                  const {transformAsync} = await import('@babel/core');

                  const {code: transformedCode, map} =
                    (await transformAsync(code, {
                      filename: id,
                      babelrc: false,
                      configFile: false,
                      presets: normalizedBabelPresets,
                      plugins: finalPlugins,
                    })) ?? {};

                  return {code: transformedCode ?? undefined, map};
                },
              });
            }

            plugins.push(prefresh());

            return plugins;
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'App.Develop',
          label: `Running app ${project.name} in development mode`,
          async run(runner) {
            await import('@quilted/quilt/polyfills/fetch');

            const [
              {createServer},
              {default: express},
              {default: getPort},
              configurationHooks,
              serverConfigurationHooks,
            ] = await Promise.all([
              import('vite'),
              import('express'),
              import('get-port'),
              configuration(),
              configuration({quiltAppServer: true, quiltRequestRouter: true}),
            ]);

            const {quiltAppServerPort, quiltAppServerHost} = configurationHooks;

            const [resolvedPort, resolvedHost] = await Promise.all([
              quiltAppServerPort!.run(port),
              quiltAppServerHost!.run(undefined),
            ]);

            const viteServer = await createServer(
              await createViteConfig(project, configurationHooks),
            );

            const appServer = await createAppServer(serverConfigurationHooks, {
              project,
              vite: viteServer,
              onMessage(message) {
                runner.log(message);
              },
            });

            const app = express();

            app.use((request, response, next) => {
              // This prevents issues when an HTML route in the application matches
              // the name of a directory in the project.
              if (request.headers.accept?.includes('text/html') ?? false) {
                return next();
              }

              return viteServer.middlewares(request, response, next);
            });

            app.use((request, response) => {
              appServer.handle(request, response);
            });

            const finalPort = resolvedPort ?? (await getPort({port: 3000}));

            try {
              if (resolvedHost) {
                app.listen(finalPort, resolvedHost, () => {
                  // eslint-disable-next-line no-console
                  console.log(`Listening on ${resolvedHost}:${finalPort}`);
                });
              } else {
                app.listen(finalPort, () => {
                  // eslint-disable-next-line no-console
                  console.log(`Listening on localhost:${finalPort}`);
                });
              }
            } catch (error) {
              if ((error as any)?.code === 'EADDRINUSE') {
                throw new DiagnosticError({
                  title: `${project.name}’s development server failed to start`,
                  suggestion(ui) {
                    return `The requested port (${finalPort}) is already in use. Set a different port in ${ui.Text(
                      path.relative(process.cwd(), project.configuration.path),
                      {emphasis: 'strong'},
                    )}’s ${ui.Code(
                      'develop.port',
                    )} option, or remove this option entirely to get an available port automatically.`;
                  },
                });
              }

              throw error;
            }
          },
        }),
      );
    },
  });
}

async function createAppServer(
  {
    rollupInput,
    rollupExternals,
    rollupPlugins,
    rollupOutputs,
    rollupInputOptions,
    quiltAppDevelopmentServer,
  }: ResolvedDevelopProjectConfigurationHooks,
  {
    project,
    vite,
    onMessage,
  }: {project: Project; vite: ViteDevServer; onMessage(message: string): void},
) {
  const [
    {watch},
    {notFound, html, EnhancedResponse},
    {createRequest, sendResponse},
    developmentServer,
  ] = await Promise.all([
    import('rollup'),
    import('@quilted/quilt/request-router'),
    import('@quilted/quilt/request-router/node'),
    quiltAppDevelopmentServer!.run(createDefaultAppDevelopmentServer()),
  ]);

  let resolveHandler!: (handler: AppDevelopmentServerHandler) => void;
  let requestRouterPromise!: Promise<AppDevelopmentServerHandler>;

  const file = project.fs.temporaryPath('develop/server/built.js');

  const [input, plugins, external] = await Promise.all([
    rollupInput!.run([]),
    rollupPlugins!.run([]),
    rollupExternals!.run([]),
  ]);

  const [inputOptions, outputs] = await Promise.all([
    rollupInputOptions!.run({
      input,
      plugins,
      external,
      preserveEntrySignatures: 'exports-only',
    }),
    rollupOutputs!.run([
      {
        format: 'esm',
        dir: path.dirname(file),
        entryFileNames: path.basename(file),
        assetFileNames: `[name].[hash].[ext]`,
        chunkFileNames: `[name].[hash].js`,
        exports: 'auto',
      },
    ]),
  ]);

  const watcher = watch({
    ...inputOptions,
    output: outputs,
  });

  const entry = path.join(
    outputs[0]!.dir!,
    outputs[0]!.entryFileNames as string,
  );

  let started = false;

  watcher.on('event', (event) => {
    switch (event.code) {
      case 'BUNDLE_START': {
        requestRouterPromise = new Promise<AppDevelopmentServerHandler>(
          (resolve) => {
            resolveHandler = resolve;
          },
        );
        break;
      }
      case 'BUNDLE_END': {
        developmentServer
          .rebuild(entry)
          .then((handler) => {
            if (started) {
              onMessage(`Restarted app server (built in ${event.duration}ms)`);
            } else {
              started = true;
              onMessage(`Started app server (built in ${event.duration}ms)`);
            }

            resolveHandler(handler);
          })
          // eslint-disable-next-line no-console
          .catch(console.error.bind(console));
        break;
      }
      case 'ERROR': {
        // eslint-disable-next-line no-console
        console.error(event.error);
        break;
      }
    }
  });

  return {
    async handle(req: IncomingMessage, serverResponse: ServerResponse) {
      const router = await requestRouterPromise;
      const request = createRequest(req);

      try {
        const response = (await router.fetch(request, req)) ?? notFound();

        const contentType = response.headers.get('Content-Type');

        if (contentType != null && contentType.includes('text/html')) {
          const transformedHtml = await vite.transformIndexHtml(
            request.url,
            await response.text(),
          );

          await sendResponse(
            new EnhancedResponse(transformedHtml, response),
            serverResponse,
          );

          return;
        }

        await sendResponse(response, serverResponse);
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(error);
        await sendResponse(
          html(
            `<html><body><pre>${
              error.stack ?? error.message
            }</pre></body></html>`,
          ),
          serverResponse,
        );
      }
    },
  };
}

function createDefaultAppDevelopmentServer(): AppDevelopmentServer {
  return {
    async rebuild(entry) {
      try {
        const {default: handler} = await import(
          `${entry}?update=${Date.now()}`
        );

        return {
          fetch(request) {
            return handler.fetch(request);
          },
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        throw error;
      }
    },
  };
}

function babelConfigItemIs(
  configItem: import('@babel/core').PluginItem,
  compare: string,
) {
  return (
    (typeof configItem === 'string' && configItem.includes(compare)) ||
    (Array.isArray(configItem) &&
      typeof configItem[0] === 'string' &&
      configItem[0].includes(compare))
  );
}
