import * as path from 'path';
import type {IncomingMessage, ServerResponse} from 'http';

import {stripIndent} from 'common-tags';
import type {ViteDevServer} from 'vite';

import {
  notFound,
  response as createResponse,
} from '@quilted/quilt/http-handlers';
import type {HttpHandler} from '@quilted/quilt/http-handlers';
import {
  transformRequest,
  applyResponse,
} from '@quilted/quilt/http-handlers/node';

import type {} from '../tools/babel';
import {createViteConfig} from '../tools/vite';

import {createProjectPlugin} from '../kit';
import type {App, ResolvedDevelopProjectConfigurationHooks} from '../kit';

import type {AppServerOptions} from './app-server-base';
import type {AppBrowserOptions} from './app-build';
import type {EnvironmentOptions} from './magic-module-env';

import {
  MAGIC_MODULE_HTTP_HANDLER,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_MANIFEST,
} from '../constants';

export const STEP_NAME = 'Quilt.App.Develop';
const MAGIC_MODULE_BROWSER_ENTRY = '/@quilted/magic/browser.tsx';
const MAGIC_MODULE_SERVER_ENTRY = '/@quilted/magic/server.tsx';
const ENTRY_EXTENSIONS = ['mjs', 'js', 'jsx', 'ts', 'tsx'];

export interface Options {
  env?: EnvironmentOptions;
  port?: number;
  server?: Pick<AppServerOptions, 'entry' | 'httpHandler' | 'env'>;
  browser?: Pick<AppBrowserOptions, 'entryModule' | 'initializeModule'>;
}

export function appDevelop({env, port, browser, server}: Options = {}) {
  const serverEntry = server?.entry;
  const httpHandler = server?.httpHandler ?? true;
  const serverInlineEnv = server?.env?.inline;

  return createProjectPlugin<App>({
    name: STEP_NAME,
    develop({project, internal, workspace, configure, run}) {
      configure(
        (
          {
            babelPlugins,
            babelPresets,
            babelExtensions,
            vitePort,
            viteHost,
            vitePlugins,
            viteRollupOptions,
            viteServerOptions,
            viteOptimizeDepsExclude,
            rollupPlugins,
            quiltAppServerHost,
            quiltAppServerPort,
            quiltAppServerEntryContent,
            quiltAppBrowserEntryContent,
            quiltAppBrowserEntryCssSelector,
            quiltAppBrowserEntryShouldHydrate,
            quiltInlineEnvironmentVariables,
            quiltRuntimeEnvironmentVariables,
            quiltEnvModuleContent,
            quiltHttpHandlerRuntimeContent,
          },
          {quiltHttpHandler = false},
        ) => {
          const inlineEnv = env?.inline;

          if (
            quiltHttpHandler &&
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

          viteServerOptions?.((options) => {
            const newOptions = {...options};

            newOptions.middlewareMode = 'ssr';

            return newOptions;
          });

          rollupPlugins?.((plugins) => {
            return [
              {
                name: '@quilted/magic-module/app-manifest',
                async resolveId(id) {
                  if (id === MAGIC_MODULE_SERVER_ENTRY) return id;
                  return null;
                },
                async load(source) {
                  if (source !== MAGIC_MODULE_SERVER_ENTRY) return null;

                  const baseContent =
                    httpHandler && serverEntry
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
                      import {createServerRenderingHttpHandler} from '@quilted/quilt/server';
      
                      export default createServerRenderingHttpHandler(App, {
                        assets: createAssetManifest(),
                      });
                    `;

                  return quiltAppServerEntryContent!.run(baseContent);
                },
              },
              {
                name: '@quilted/magic-module/asset-loader',
                async resolveId(id) {
                  if (id === MAGIC_MODULE_APP_ASSET_MANIFEST) return id;
                  return null;
                },
                async load(source) {
                  if (source !== MAGIC_MODULE_APP_ASSET_MANIFEST) return null;

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
                                source: MAGIC_MODULE_BROWSER_ENTRY,
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

          quiltHttpHandlerRuntimeContent?.(async () => {
            return stripIndent`
              export {default} from ${JSON.stringify(
                MAGIC_MODULE_HTTP_HANDLER,
              )};
            `;
          });

          viteRollupOptions?.(async (options) => {
            if (options.input) return options;

            const entryFiles = await Promise.all([
              resolveToActualFiles(project.entry ?? 'index'),
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
            'react-dom',
            '@quilted/quilt/react',
            '@quilted/quilt/react/jsx-runtime',
            '@quilted/quilt/env',
            '@quilted/quilt/global',
          ]);

          vitePlugins?.(async (plugins) => {
            const [
              {magicBrowserEntry},
              {magicModuleEnv},
              requestedBabelPlugins,
              requestedBabelPresets,
            ] = await Promise.all([
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
              // Omit preset-env entirely, Vite handles that with esbuild
              if (babelConfigItemIs(requestedPreset, '@babel/preset-env'))
                continue;

              // Instead of compiling TypeScript away entirely, we will just teach Babel
              // to parse the syntax
              if (
                babelConfigItemIs(requestedPreset, '@babel/preset-typescript')
              ) {
                normalizedBabelPlugins.unshift([
                  '@babel/plugin-syntax-typescript',
                  {isTSX: true},
                ]);
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
                      plugins: normalizedBabelPlugins,
                    })) ?? {};

                  return {code: transformedCode ?? undefined, map};
                },
              });
            }

            return plugins;
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'App.Develop',
          label: `Running app ${project.name} in development mode`,
          async run(runner) {
            const [
              {createServer},
              {default: express},
              configurationHooks,
              serverConfigurationHooks,
            ] = await Promise.all([
              import('vite'),
              import('express'),
              configuration(),
              configuration({quiltAppServer: true, quiltHttpHandler: true}),
            ]);

            const {quiltAppServerPort, quiltAppServerHost} = configurationHooks;

            const [resolvedPort = 3000, resolvedHost] = await Promise.all([
              quiltAppServerPort!.run(port),
              quiltAppServerHost!.run(undefined),
            ]);

            const viteServer = await createServer(
              await createViteConfig(configurationHooks, {internal}),
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

            if (resolvedHost) {
              app.listen(resolvedPort, resolvedHost, () => {
                // eslint-disable-next-line no-console
                console.log(`Listening on ${resolvedHost}:${resolvedPort}`);
              });
            } else {
              app.listen(resolvedPort, () => {
                // eslint-disable-next-line no-console
                console.log(`Listening on localhost:${resolvedPort}`);
              });
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
    rollupInputOptions,
  }: ResolvedDevelopProjectConfigurationHooks<App>,
  {
    project,
    vite,
    onMessage,
  }: {project: App; vite: ViteDevServer; onMessage(message: string): void},
) {
  const [{watch}] = await Promise.all([import('rollup')]);

  let resolveHandler!: (handler: HttpHandler) => void;
  let httpHandlerPromise!: Promise<HttpHandler>;

  const file = project.fs.buildPath('develop/quilt-app-server/built.js');

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
      preserveEntrySignatures: 'exports-only',
    }),
  ]);

  const watcher = watch({
    ...inputOptions,
    output: {
      format: 'esm',
      dir: path.dirname(file),
      entryFileNames: path.basename(file),
      exports: 'auto',
    },
  });

  watcher.on('event', (event) => {
    switch (event.code) {
      case 'BUNDLE_START': {
        httpHandlerPromise = new Promise<HttpHandler>((resolve) => {
          resolveHandler = resolve;
        });
        break;
      }
      case 'BUNDLE_END': {
        import(`${file}?update=${Date.now()}`)
          .then(({default: handler}) => {
            onMessage(`Restarted app server (built in ${event.duration}ms)`);
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
    async handle(request: IncomingMessage, serverResponse: ServerResponse) {
      const [handler, transformedRequest] = await Promise.all([
        httpHandlerPromise,
        transformRequest(request),
      ]);

      const response = (await handler.run(transformedRequest)) ?? notFound();

      const contentType = response.headers.get('Content-Type');

      if (contentType != null && contentType.includes('text/html')) {
        const transformedHtml = await vite.transformIndexHtml(
          transformedRequest.url.toString(),
          response.body ?? '',
        );

        applyResponse(
          createResponse(transformedHtml, response),
          serverResponse,
        );

        return;
      }

      applyResponse(response, serverResponse);
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
