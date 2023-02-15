import * as path from 'path';

import {stripIndent} from 'common-tags';
import type {ModuleFormat} from 'rollup';

import {
  MAGIC_MODULE_APP_ASSET_MANIFEST,
  MAGIC_MODULE_REQUEST_ROUTER,
} from '../constants';
import {createProjectPlugin} from '../kit';
import type {WaterfallHook, WaterfallHookWithDefault} from '../kit';

import {STEP_NAME} from './app-build';
import type {AppServerOptions} from './app-server-base';

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
                if (id === MAGIC_MODULE_APP_ASSET_MANIFEST) {
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

                      return JSON.parse(manifestString);
                    }),
                  )
                ).sort(
                  (manifestA, manifestB) =>
                    (manifestA.metadata.priority ?? 0) -
                    (manifestB.metadata.priority ?? 0),
                );

                return stripIndent`
                  import {createAssetManifest as createBaseAssetManifest} from '@quilted/quilt/server';

                  export function createAssetManifest() {
                    const manifests = JSON.parse(${JSON.stringify(
                      JSON.stringify(manifests),
                    )});
  
                    for (const manifest of manifests) {
                      manifest.metadata.browsers =
                        manifest.metadata.browsers
                          ? new RegExp(manifest.metadata.browsers)
                          : undefined;
                    }
  
                    // The default manifest is the last one, since it has the widest browser support.
                    const defaultManifest = manifests[manifests.length - 1];

                    return createBaseAssetManifest({
                      getBuild({userAgent}) {
                        // If there is no user agent, use the default manifest.
                        if (typeof userAgent !== 'string') return defaultManifest;
  
                        for (const manifest of manifests) {
                          if (manifest.metadata.browsers instanceof RegExp && manifest.metadata.browsers.test(userAgent)) {
                            return manifest;
                          }
                        }
  
                        return defaultManifest;
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
              import('../tools/rollup'),
            ]);

            await buildWithRollup(project, configure);
          },
        }),
      );
    },
  });
}
