import {stripIndent} from 'common-tags';
import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App, WaterfallHook} from '@quilted/sewing-kit';

import {
  MAGIC_MODULE_APP_ASSET_MANIFEST,
  MAGIC_MODULE_APP_COMPONENT,
} from '../constants';

import {STEP_NAME} from './app-build';

export interface AutoServerOptions {
  /**
   * Indicates that the auto-server build is being generated by `quilt`.
   */
  quiltAutoServer: boolean;
}

export interface AutoServerHooks {
  quiltAutoServerContent: WaterfallHook<string | undefined>;
  quiltAutoServerPort: WaterfallHook<number | undefined>;
  quiltAutoServerHost: WaterfallHook<string | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppOptions extends AutoServerOptions {}
  interface BuildAppConfigurationHooks extends AutoServerHooks {}
}

export function appAutoServer() {
  return createProjectPlugin<App>({
    name: 'Quilt.App.AutoServer',
    build({project, hooks, configure, run}) {
      hooks<AutoServerHooks>(({waterfall}) => ({
        quiltAutoServerHost: waterfall(),
        quiltAutoServerPort: waterfall(),
        quiltAutoServerContent: waterfall(),
      }));

      configure(
        (
          {
            outputDirectory,
            rollupPlugins,
            rollupOutputs,
            rollupInputOptions,
            quiltAutoServerHost,
            quiltAutoServerPort,
            quiltAutoServerContent,
            quiltHttpHandlerHost,
            quiltHttpHandlerPort,
            quiltHttpHandlerContent,
            quiltAsyncPreload,
            quiltAsyncManifest,
          },
          {quiltAutoServer = false},
        ) => {
          if (!quiltAutoServer) return;

          quiltAsyncPreload?.(() => false);
          quiltAsyncManifest?.(() => false);

          quiltHttpHandlerHost?.(async () =>
            quiltAutoServerHost!.run(undefined),
          );

          quiltHttpHandlerPort?.(async () =>
            quiltAutoServerPort!.run(undefined),
          );

          quiltHttpHandlerContent?.(
            async () =>
              (await quiltAutoServerContent!.run(undefined)) ??
              stripIndent`
                import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
                import assets from ${JSON.stringify(
                  MAGIC_MODULE_APP_ASSET_MANIFEST,
                )};
                import {createServerRenderingHttpHandler} from '@quilted/quilt/server';

                export default createServerRenderingHttpHandler(App, {assets});
              `,
          );

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = false;
            return options;
          });

          rollupPlugins?.(async (plugins) => {
            const {cssRollupPlugin} = await import('./rollup/css');

            plugins.push(cssRollupPlugin({extract: false}));

            plugins.push({
              name: '@quilted/magic-module/asset-manifest',
              async resolveId(id) {
                if (id === MAGIC_MODULE_APP_ASSET_MANIFEST) return id;
                return null;
              },
              async load(source) {
                if (source !== MAGIC_MODULE_APP_ASSET_MANIFEST) return null;

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
                  import {createAssetLoader} from '@quilted/async/server';

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

                  const assetLoader = createAssetLoader({
                    async getManifest({userAgent}) {
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

                  export default assetLoader;
                `;
              },
            });

            return plugins;
          });

          rollupOutputs?.(async (outputs) => [
            ...outputs,
            {
              format: 'esm',
              entryFileNames: 'index.js',
              dir: await outputDirectory.run(project.fs.buildPath('server')),
            },
          ]);
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.App.AutoServer',
          label: `Build automatic server for app ${project.name}`,
          needs: (step) => {
            return {
              need: step.target === project && step.name === STEP_NAME,
              allowSkip: true,
            };
          },
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({quiltAutoServer: true, quiltHttpHandler: true}),
              import('@quilted/sewing-kit-rollup'),
            ]);

            await buildWithRollup(configure);
          },
        }),
      );
    },
  });
}
