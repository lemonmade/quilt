import * as path from 'path';

import {stripIndent} from 'common-tags';
import type {ModuleFormat} from 'rollup';
import type {AssetsBuildManifest} from '@quilted/quilt';

import {
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from '../constants.ts';
import {createProjectPlugin} from '../kit.ts';
import type {WaterfallHook, WaterfallHookWithDefault} from '../kit.ts';

import {STEP_NAME} from './app-build.ts';
import type {AppServerOptions} from './app-server-base.ts';

export interface AppServerBuildHooks {
  /**
   * The module format that will be used for the application server. By
   * default, this is set to `module`, which generates native ES module
   * outputs.
   */
  quiltAppServerOutputFormat: WaterfallHook<ModuleFormat>;

  /**
   * Whether the automatic server will serve assets for the browser build.
   * If this is `true`, you must ensure that your assets are stored in an
   * `assets` directory that is a sibling to the `server` directory that
   * will contain your server files. This is done automatically for you
   * with the default configuration applied by Quilt.
   */
  quiltAppServerServeAssets: WaterfallHookWithDefault<boolean>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends AppServerBuildHooks {}
}

const MAGIC_MODULE_ASSET_MANIFEST_ENTRY = '.quilt/magic/asset-manifest.js';

export function appServerBuild({
  format = 'request-router',
  serveAssets = true,
}: AppServerOptions = {}) {
  const requestRouter = format === 'request-router';

  return createProjectPlugin({
    name: 'Quilt.App.Server',
    build({project, hooks, configure, run}) {
      hooks<AppServerBuildHooks>(({waterfall}) => ({
        quiltAppServerOutputFormat: waterfall(),
        quiltAppServerServeAssets: waterfall({default: serveAssets}),
      }));

      configure(
        (
          {
            outputDirectory,
            rollupPlugins,
            rollupOutputs,
            quiltAppBrowserTargets,
            quiltAppServerHost,
            quiltAppServerPort,
            quiltAppServerOutputFormat,
            quiltAppServerServeAssets,
            quiltRequestRouterHost,
            quiltRequestRouterPort,
            quiltRequestRouterRuntimeContent,
            quiltAssetBaseUrl,
          },
          {quiltAppServer = false},
        ) => {
          if (!quiltAppServer) return;

          rollupPlugins?.(async (plugins) => {
            plugins.unshift({
              name: '@quilted/magic-module/asset-manifest',
              async resolveId(id) {
                if (id === MAGIC_MODULE_BROWSER_ASSETS) {
                  return project.fs.resolvePath(
                    MAGIC_MODULE_ASSET_MANIFEST_ENTRY,
                  );
                }

                return null;
              },
              async load(source) {
                if (
                  source !==
                  project.fs.resolvePath(MAGIC_MODULE_ASSET_MANIFEST_ENTRY)
                ) {
                  return null;
                }

                const manifestFiles = await project.fs.glob('manifest*.json', {
                  cwd: project.fs.buildPath('manifests'),
                  onlyFiles: true,
                });

                const manifests = (
                  await Promise.all(
                    manifestFiles.map(async (manifestFile) => {
                      const manifestString = await project.fs.read(
                        manifestFile,
                      );

                      return JSON.parse(manifestString) as AssetsBuildManifest;
                    }),
                  )
                ).sort(
                  (manifestA, manifestB) =>
                    (manifestA.priority ?? 0) - (manifestB.priority ?? 0),
                );

                const browserTargets = await quiltAppBrowserTargets!.run();
                const defaultBrowserTarget =
                  browserTargets[browserTargets.length - 1];
                const browserTests: {name: string; test: string}[] = [];

                const {getUserAgentRegex} = await import(
                  'browserslist-useragent-regexp'
                );

                for (const target of browserTargets) {
                  const {name, browsers} = target;

                  browserTests.push({
                    name,
                    test:
                      target === defaultBrowserTarget
                        ? ''
                        : getUserAgentRegex({
                            browsers,
                            ignoreMinor: true,
                            ignorePatch: true,
                            allowHigherVersions: true,
                          }).source,
                  });
                }

                return stripIndent`
                  import {createBrowserAssetsFromManifests} from '@quilted/quilt/server';

                  export function createBrowserAssets() {
                    const manifests = JSON.parse(${JSON.stringify(
                      JSON.stringify(manifests),
                    )});

                    const browserGroupTests = [
                      ${browserTests
                        .map(
                          ({name, test}) =>
                            `[${JSON.stringify(
                              name,
                            )}, new RegExp(${JSON.stringify(test)})]`,
                        )
                        .join(', ')}
                    ];
  
                    // The default manifest is the last one, since it has the widest browser support.
                    const defaultManifest = manifests[manifests.length - 1];

                    return createBrowserAssetsFromManifests(manifests, {
                      defaultManifest,
                      cacheKey(request) {
                        const userAgent = request.headers.get('User-Agent');

                        if (userAgent) {
                          for (const [name, test] of browserGroupTests) {
                            if (test.test(userAgent)) return {browserGroup: name};
                          }
                        }

                        return {};
                      },
                    });
                  }
                `;
              },
            });

            return plugins;
          });

          rollupOutputs?.(async (outputs) => {
            const [format, outputRoot] = await Promise.all([
              quiltAppServerOutputFormat!.run('module'),
              outputDirectory.run(project.fs.buildPath()),
            ]);

            outputs.push({
              format,
              entryFileNames: 'server.js',
              dir: path.join(outputRoot, 'server'),
            });

            return outputs;
          });

          if (requestRouter) {
            quiltRequestRouterHost?.(async () =>
              quiltAppServerHost!.run(undefined),
            );

            quiltRequestRouterPort?.(async () =>
              quiltAppServerPort!.run(undefined),
            );

            quiltRequestRouterRuntimeContent?.(async (content) => {
              if (content) return content;

              const [port, host, serveAssets, format, assetBaseUrl] =
                await Promise.all([
                  quiltRequestRouterPort!.run(undefined),
                  quiltRequestRouterHost!.run(undefined),
                  quiltAppServerServeAssets!.run(),
                  quiltAppServerOutputFormat!.run('module'),
                  quiltAssetBaseUrl!.run(),
                ]);

              return stripIndent`
                ${serveAssets ? `import * as path from 'path';` : ''}
                ${
                  serveAssets && format === 'module'
                    ? `import {fileURLToPath} from 'url';`
                    : ''
                }
                import {createServer} from 'http';

                import requestRouter from ${JSON.stringify(
                  MAGIC_MODULE_REQUEST_ROUTER,
                )};
      
                import {createHttpRequestListener${
                  serveAssets ? ', serveStatic' : ''
                }} from '@quilted/quilt/request-router/node';

                const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
                const host = ${
                  host ? JSON.stringify(host) : 'process.env.HOST'
                };

                ${
                  serveAssets
                    ? `const dirname = ${
                        format === 'module'
                          ? 'path.dirname(fileURLToPath(import.meta.url))'
                          : '__dirname'
                      };\nconst serve = serveStatic(path.resolve(dirname, '../assets'), {
                        baseUrl: ${JSON.stringify(assetBaseUrl)},
                      });`
                    : ''
                }
                const listener = createHttpRequestListener(requestRouter);
              
                createServer(async (request, response) => {
                  ${
                    serveAssets
                      ? `if (request.url.startsWith(${JSON.stringify(
                          assetBaseUrl,
                        )})) return serve(request, response);`
                      : ''
                  }

                  await listener(request, response);
                }).listen(port, host);
              `;
            });
          }
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.App.Server',
          label: `Build automatic server for app ${project.name}`,
          needs: (step) => {
            return {
              need: step.target === project && step.name === STEP_NAME,
              allowSkip: true,
            };
          },
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({
                quiltAppServer: true,
                quiltRequestRouter: requestRouter,
              }),
              import('../tools/rollup.ts'),
            ]);

            await buildWithRollup(project, configure);
          },
        }),
      );
    },
  });
}
