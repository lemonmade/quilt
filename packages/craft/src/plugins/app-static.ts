import * as path from 'path';
import {rm} from 'fs/promises';

import {stripIndent} from 'common-tags';
import {createProjectPlugin, Runtime, TargetRuntime} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import type {Manifest} from '@quilted/async/server';
import type {Options as StaticRenderOptions} from '@quilted/quilt/static';

import type {OutputChunk} from 'rollup';

import {
  MAGIC_MODULE_APP_ASSET_MANIFEST,
  MAGIC_MODULE_APP_COMPONENT,
} from '../constants';

import {STEP_NAME} from './app-build';

export interface AppStaticOptions {}

export interface AppServerBuildOptions {
  /**
   * Indicates that the static app build is being generated by Quilt.
   */
  quiltAppStatic: boolean;
}

export interface AppStaticHooks {}

declare module '@quilted/sewing-kit' {
  interface BuildAppOptions extends AppServerBuildOptions {}
  interface BuildAppConfigurationHooks extends AppStaticHooks {}
}

const MAGIC_ENTRY_MODULE = '__quilt__/AppStaticEntry';
const PRELOAD_ALL_GLOBAL = '__QUILT_ASYNC_PRELOAD_ALL__';

export function appStatic(_options?: AppStaticOptions) {
  return createProjectPlugin<App>({
    name: 'Quilt.App.Static',
    build({project, internal, hooks, configure, run}) {
      const outputDirectory = internal.fs.tempPath(
        'quilt-static',
        project.name,
      );
      const outputFilename = 'index.js';

      hooks<AppStaticHooks>(({waterfall}) => ({
        quiltAppServerHost: waterfall(),
        quiltAppServerPort: waterfall(),
        quiltAppServerOutputFormat: waterfall(),
        quiltAppServerEntryContent: waterfall(),
      }));

      configure(
        (
          {
            runtime,
            targets,
            rollupInput,
            rollupPlugins,
            rollupExternals,
            rollupOutputs,
            rollupNodeBundle,
            rollupInputOptions,
            quiltAsyncPreload,
            quiltAsyncManifest,
          },
          {quiltAppStatic = false},
        ) => {
          if (!quiltAppStatic) return;

          runtime?.(() => new TargetRuntime([Runtime.Node]));
          targets?.(() => ['current node']);

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          // Don’t bundle, we’ll let native Node resolution work its magic
          rollupNodeBundle?.(() => false);

          rollupExternals?.((externals) => {
            externals.push('prettier');
            return externals;
          });

          quiltAsyncPreload?.(() => false);
          quiltAsyncManifest?.(() => false);

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = 'exports-only';
            return options;
          });

          rollupPlugins?.(async (plugins) => {
            const {cssRollupPlugin} = await import('./rollup/css');

            plugins.push(cssRollupPlugin({extract: false}));

            plugins.push({
              name: '@quilted/magic-module/static-asset-manifest',
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

                      return JSON.parse(manifestString) as Manifest;
                    }),
                  )
                )
                  // Sort in ascending priority, we want to get the lowest module and nomodule targets
                  .sort(
                    (manifestA, manifestB) =>
                      (manifestB.metadata.priority ?? 0) -
                      (manifestA.metadata.priority ?? 0),
                  );

                const defaultManifest = manifests[0];
                const moduleManifest = manifests.find(
                  (manifest) => manifest.metadata.modules,
                );
                const noModuleManifest =
                  defaultManifest === moduleManifest
                    ? undefined
                    : defaultManifest;

                const manifestToCode = (manifest?: Manifest) =>
                  manifest == null
                    ? 'undefined'
                    : `JSON.parse(${JSON.stringify(JSON.stringify(manifest))})`;

                return stripIndent`
                  import {createAssetLoader} from '@quilted/async/server';

                  const noModuleManifest = ${manifestToCode(noModuleManifest)};
                  const moduleManifest = ${manifestToCode(moduleManifest)};

                  const assetLoader = createAssetLoader({
                    async getManifest({modules}) {
                      if (modules) {
                        if (moduleManifest) return moduleManifest;

                        return {
                          metadata: {modules: true},
                          async: {},
                          entry: {scripts: [], styles: []},
                        };
                      }

                      if (noModuleManifest) return noModuleManifest;

                      return {
                        metadata: {modules: false},
                        async: {},
                        entry: {scripts: [], styles: []},
                      };
                    },
                  });

                  export default assetLoader;
                `;
              },
            });

            plugins.push({
              name: '@quilted/magic-app-static-entry',
              resolveId(id) {
                if (id === MAGIC_ENTRY_MODULE) {
                  return {id, moduleSideEffects: 'no-treeshake'};
                }

                return null;
              },
              load(source) {
                if (source !== MAGIC_ENTRY_MODULE) return null;
                return stripIndent`
                  import '@quilted/quilt/global';

                  import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
                  import assets from ${JSON.stringify(
                    MAGIC_MODULE_APP_ASSET_MANIFEST,
                  )};
                  import {renderStatic} from '@quilted/quilt/static';

                  export default async function render(options) {
                    await ${PRELOAD_ALL_GLOBAL};
                    await renderStatic(App, {assets, ...options});
                  }
                `;
              },
              generateBundle(_, bundle) {
                const outputs = Object.values(bundle);
                const dynamicImports = outputs.filter(
                  (chunk): chunk is OutputChunk =>
                    chunk.type === 'chunk' && chunk.isDynamicEntry,
                );

                const preloadAllPromise = `Promise.all([${dynamicImports
                  .map(
                    (imported) =>
                      // Not doing this trips up esbuild’s parser for the "from source"
                      // build, lol
                      `${'im'}${'port'}('./${imported.fileName}')`,
                  )
                  .join(', ')}])`;

                for (const output of outputs) {
                  if (output.type !== 'chunk') continue;
                  output.code = output.code.replaceAll(
                    PRELOAD_ALL_GLOBAL,
                    preloadAllPromise,
                  );
                }
              },
            });

            return plugins;
          });

          rollupOutputs?.(async (outputs) => {
            outputs.push({
              format: 'esm',
              entryFileNames: outputFilename,
              dir: outputDirectory,
            });

            return outputs;
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.App.Static',
          label: `Build static outputs for app ${project.name}`,
          needs: (step) => {
            return {
              need: step.target === project && step.name === STEP_NAME,
              allowSkip: true,
            };
          },
          async run() {
            await rm(outputDirectory, {
              force: true,
              recursive: true,
            });

            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({
                quiltAppStatic: true,
              }),
              import('@quilted/sewing-kit-rollup'),
            ]);

            await buildWithRollup(configure);

            const {default: renderStatic} = await (import(
              path.join(outputDirectory, outputFilename)
            ) as Promise<{
              default: (
                options: Omit<StaticRenderOptions, 'assets'>,
              ) => Promise<void>;
            }>);

            await renderStatic({
              routes: ['/'],
              async onRender({route, hasChildren, content, fallback, http}) {
                console.log(
                  `Static rendered ${route}${fallback ? ' (fallback)' : ''}`,
                );
                if (!fallback && http.statusCode !== 200) return;

                const normalizedRoute = route.replace(/^[/]/, '');
                const filename = fallback ? '404.html' : 'index.html';

                await project.fs.write(
                  project.fs.buildPath(
                    normalizedRoute === '' || fallback || hasChildren
                      ? path.join(normalizedRoute, filename)
                      : `${normalizedRoute}.html`,
                  ),
                  content,
                );
              },
            });
          },
        }),
      );
    },
  });
}
