import {stripIndent} from 'common-tags';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {response as createResponse} from '@quilted/quilt/http-handlers';
import type {HttpHandler} from '@quilted/quilt/http-handlers';
import {
  transformRequest,
  applyResponse,
} from '@quilted/quilt/http-handlers/node';

import {getViteServer} from '@quilted/sewing-kit-vite';
import type {} from '@quilted/sewing-kit-babel';

import type {AppServerOptions} from './app-server';
import type {AppBrowserOptions} from './app-build';
import {loadEnv, createEnvModuleContent} from './magic-module-env';
import type {EnvironmentOptions} from './magic-module-env';

import {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_APP_ASSET_LOADER,
  MAGIC_MODULE_ENV,
} from '../constants';

export const STEP_NAME = 'Quilt.App.Develop';
const MAGIC_MODULE_BROWSER_ENTRY = '/@quilted/magic/browser.tsx';
const MAGIC_MODULE_SERVER_ENTRY = '/@quilted/magic/server.tsx';

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
        ({
          babelPlugins,
          babelPresets,
          babelExtensions,
          vitePort,
          viteHost,
          vitePlugins,
          viteSsrNoExternals,
          quiltAppServerHost,
          quiltAppServerPort,
          quiltAppServerEntryContent,
          quiltAppBrowserEntryContent,
          quiltAppBrowserEntryCssSelector,
          quiltAppBrowserEntryShouldHydrate,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
          quiltEnvModuleContent,
        }) => {
          const inlineEnv = env?.inline;

          if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          vitePort?.((existingPort) =>
            quiltAppServerPort!.run(port ?? existingPort),
          );

          viteHost?.((host) => quiltAppServerHost!.run(host));

          viteSsrNoExternals?.((noExternals) => [
            ...noExternals,
            // We keep all of these external so we can apply our rollup aliases
            // and improved transformations.
            'react',
            'react-dom',
            /@quilted/,
          ]);

          vitePlugins?.(async (plugins) => {
            const [
              {magicBrowserEntry},
              requestedBabelPlugins,
              requestedBabelPresets,
            ] = await Promise.all([
              import('./rollup/magic-browser-entry'),
              babelPlugins!.run([]),
              babelPresets!.run([]),
            ]);

            // This is just like the build plugins in ./magic-module-env, but is able to do
            // a runtime customization to include the server env variables, but only when
            // the SSR build is being produced.
            plugins.unshift({
              name: '@quilted/magic-module-env',
              enforce: 'pre',
              resolveId(id) {
                if (id === MAGIC_MODULE_ENV) return id;
                return null;
              },
              async load(id, {ssr = false} = {}) {
                if (id !== MAGIC_MODULE_ENV) return null;

                const [env, runtime, inline] = await Promise.all([
                  loadEnv(project, workspace, {mode: 'development'}),
                  quiltRuntimeEnvironmentVariables!.run(
                    ssr ? 'process.env' : undefined,
                  ),
                  quiltInlineEnvironmentVariables!.run(
                    ssr && serverInlineEnv ? serverInlineEnv : [],
                  ),
                ]);

                const content = await quiltEnvModuleContent!.run(
                  createEnvModuleContent({
                    env,
                    inline,
                    runtime,
                  }),
                );

                return content;
              },
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

            plugins.unshift({
              name: '@quilted/magic-module/app-manifest',
              enforce: 'pre',
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
                      import assets from ${JSON.stringify(
                        MAGIC_MODULE_APP_ASSET_LOADER,
                      )};
                      import {createServerRenderingHttpHandler} from '@quilted/quilt/server';
      
                      export default createServerRenderingHttpHandler(App, {
                        assets,
                      });
                    `;

                return quiltAppServerEntryContent!.run(baseContent);
              },
            });

            plugins.unshift({
              name: '@quilted/magic-module/asset-loader',
              enforce: 'pre',
              async resolveId(id) {
                if (id === MAGIC_MODULE_APP_ASSET_LOADER) return id;
                return null;
              },
              async load(source) {
                if (source !== MAGIC_MODULE_APP_ASSET_LOADER) return null;

                return stripIndent`
                  import {createAssetLoader} from '@quilted/quilt/server';

                  const assetLoader = createAssetLoader({
                    getManifest() {
                      return {
                        metadata: {
                          priority: 0,
                          modules: true,
                        },
                        entry: {
                          scripts: [
                            {
                              source: ${JSON.stringify(
                                MAGIC_MODULE_BROWSER_ENTRY,
                              )},
                              attributes: {
                                type: 'module',
                              },
                            },
                          ],
                          styles: [],
                        },
                      };
                    }
                  });

                  export default assetLoader;
                `;
              },
            });

            plugins.push({
              name: '@quilted/server',
              configureServer(server) {
                server.middlewares.use(
                  async (serverRequest, serverResponse, next) => {
                    try {
                      const [{default: httpHandler}, transformedRequest] =
                        await Promise.all([
                          server.ssrLoadModule(
                            MAGIC_MODULE_SERVER_ENTRY,
                          ) as Promise<{default: HttpHandler}>,
                          transformRequest(serverRequest),
                        ]);

                      const response = await httpHandler.run(
                        transformedRequest,
                      );

                      if (response == null) return next();

                      const contentType = response.headers.get('Content-Type');

                      if (
                        contentType != null &&
                        contentType.includes('text/html')
                      ) {
                        const transformedHtml = await server.transformIndexHtml(
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
                    } catch (error) {
                      server.ssrFixStacktrace(error as Error);
                      next(error);
                    }
                  },
                );
              },
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

              // ESBuild handles the React transform, though it does not currently
              // support the runtime transform.
              if (babelConfigItemIs(requestedPreset, '@babel/preset-react')) {
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
          name: 'Quilt.DevelopApp',
          label: `Running development server for ${project.name}`,
          async run(runner) {
            const configurationHooks = await configuration();

            const [{default: createServer}, viteServer, port] =
              await Promise.all([
                import('connect'),
                getViteServer({internal}, configurationHooks),
                configurationHooks.quiltAppServerPort!.run(3000),
              ]);

            const server = createServer();

            server.use(viteServer.middlewares);
            server.use(async (request, response) => {
              if (request.headers.accept?.includes('text/html') ?? false) {
                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/html');
                response.end(
                  await viteServer.transformIndexHtml(
                    request.url!,
                    stripIndent`
                      <html>
                        <body>
                          <script type="module" src=${JSON.stringify(
                            MAGIC_MODULE_BROWSER_ENTRY,
                          )}>
                          </script>
                        </body>
                      </html>
                    `,
                  ),
                );

                return;
              }

              response.statusCode = 404;
              response.end();
            });
            server.listen(port);

            runner.log(
              (ui) =>
                `Started ${ui.Link('app development server', {
                  to: `http://localhost:${port}`,
                })}`,
            );
          },
        }),
      );
    },
  });
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
