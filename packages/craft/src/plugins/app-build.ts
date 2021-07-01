import {rm} from 'fs/promises';

import type {GetModuleInfo, GetManualChunk} from 'rollup';
import type {Config as BrowserslistConfig} from 'browserslist';
import {stripIndent} from 'common-tags';

import {createProjectPlugin, TargetRuntime, Runtime} from '@quilted/sewing-kit';
import type {
  App,
  WaterfallHook,
  WaterfallHookWithDefault,
} from '@quilted/sewing-kit';

import type {} from '@quilted/async/sewing-kit';

import {MAGIC_MODULE_APP_COMPONENT} from '../constants';

export interface AssetOptions {
  /**
   * Whether to minify assets created by Quilt. Defaults to `true`.
   */
  minify: boolean;

  /**
   * The base URL where your assets are hosted. The default is `/assets/`,
   * which means that Quilt assumes assets are hosted on the same domain
   * as your application, under the `/assets/` path. This base URL is used
   * internally by Quilt in a number of places to make sure it always loads
   * your assets from the right spot.
   *
   * If you host your assets on a dedicated CDN domain, you will need to make
   * sure this value is the whole URL, like `https://my-cdn.com/assets/`.
   */
  baseUrl: string;
}

export interface AppBrowserOptions {
  /**
   * The path to a module in your project that will be run before anything
   * else in your browser entrypoint, including the code that initializes
   * the tiny Quilt runtime. This path can be absolute, or relative from
   * the root directory of the application.
   *
   * @example './browser/bootstrap'
   */
  initializeModule?: string;

  /**
   * The path to a module in your project that will be run after the
   * `initializeModule` (if provided), and after the Quilt runtime is
   * installed. If you provide this option, it replaces the default content
   * that Quilt uses. The default content either renders or hydrates your
   * application with React, so if you provide this option, you **must**
   * do this rendering yourself.
   *
   * @example './browser/entry'
   */
  entryModule?: string;
}

export interface Options {
  server: boolean;
  assets: AssetOptions;
  browser: AppBrowserOptions;
}

export interface AppBuildHooks {
  /**
   * The base URL for assets in this application. This value is used in the
   * Quilt asset manifest, during async loading, and by a number of other
   * additions to Quilt in order to correctly load assets.
   */
  quiltAssetBaseUrl: WaterfallHookWithDefault<string>;

  /**
   * If the default Quilt entry is used (that is, the developer did not provide
   * a `browser.entryModule` for the application), this hook is used to determine
   * whether the default entry should use hydration or rendering. Defaults to
   * hydrating if a server is built for this application, and false otherwise.
   */
  quiltAppBrowserEntryShouldHydrate: WaterfallHook<boolean>;

  /**
   * If the default Quilt entry is used (that is, the developer did not provide
   * a `browser.entryModule` for the application), this hook is used the CSS
   * selector that your application should be rendered into. Quilt will pass
   * this value to `document.querySelector` and render into the resulting
   * node. Defaults to `#app` (an element with `id="app"`), which is used by
   * the auto-generated Quilt server.
   */
  quiltAppBrowserEntryCssSelector: WaterfallHook<string>;

  /**
   * This hook lets you completely customize the browser entry content for the
   * application. In general, you should instead use the `browser.initializeModule`
   * option instead if you want to provide content that runs immediately when your
   * app boots, or the `browser.entryContent` option if you want to customize the
   * actual rendering code of the browser entry.
   */
  quiltAppBrowserEntryContent: WaterfallHook<string>;
}

const BROWSERSLIST_MODULES_QUERY =
  'extends @quilted/browserslist-config/modules';

const DEFAULT_BROWSERSLIST_CONFIG: BrowserslistConfig = {
  defaults: ['extends @quilted/browserslist-config/defaults'],
  modules: [BROWSERSLIST_MODULES_QUERY],
  evergreen: ['extends @quilted/browserslist-config/evergreen'],
};

const MAGIC_MODULE_CUSTOM_INITIALIZE = '__quilt__/BrowserCustomInitialize';
const MAGIC_MODULE_CUSTOM_ENTRY = '__quilt__/BrowserCustomEntry';

export interface BrowserTarget {
  name: string;
  priority: number;
  targets: string[];
}

export interface QuiltMetadata {
  /**
   * The source for a regular expression that matches the useragent
   * string of the target browsers for this build.
   */
  browsers: string;

  /**
   * The priority to use for this manifest. The priority is used at
   * runtime by quilt to determine the order in which to test manifests
   * against the browser targets for the bundle, which allows quilt to
   * select the "best" (typically, that means smallest) bundle.
   */
  priority: number;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppOptions {
    /**
     * Details about the browser build being created by Quilt.
     */
    quiltAppBrowser: BrowserTarget;
  }

  interface BuildAppConfigurationHooks extends AppBuildHooks {}
}

const MAGIC_ENTRY_MODULE = '__quilt__/AppEntry.tsx';
export const STEP_NAME = 'Quilt.App.Build';

export function appBuild({server, assets, browser}: Options) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    build({project, hooks, configure, run}) {
      hooks<AppBuildHooks>(({waterfall}) => ({
        quiltAssetBaseUrl: waterfall({
          default: assets.baseUrl,
        }),
        quiltAppBrowserEntryContent: waterfall(),
        quiltAppBrowserEntryShouldHydrate: waterfall(),
        quiltAppBrowserEntryCssSelector: waterfall(),
      }));

      configure(
        (
          {
            runtime,
            targets,
            outputDirectory,
            rollupInput,
            rollupInputOptions,
            rollupOutputs,
            rollupPlugins,
            quiltAsyncManifestPath,
            quiltAsyncManifestMetadata,
            quiltAssetBaseUrl,
            quiltAsyncAssetBaseUrl,
            quiltAppBrowserEntryContent,
            quiltAppBrowserEntryShouldHydrate,
            quiltAppBrowserEntryCssSelector,
          },
          {quiltAppBrowser: browserTargets},
        ) => {
          if (!browserTargets) return;

          runtime(() => new TargetRuntime([Runtime.Browser]));

          const targetFilenamePart = `.${browserTargets.name}`;

          targets?.(() => browserTargets.targets);

          quiltAsyncManifestMetadata?.(async (metadata) => {
            const {getUserAgentRegExp} = await import(
              'browserslist-useragent-regexp'
            );

            Object.assign(metadata, {
              priority: browserTargets.priority,
              browsers: getUserAgentRegExp({
                browsers: browserTargets.targets,
                ignoreMinor: true,
                ignorePatch: true,
                allowHigherVersions: true,
              }).source,
            } as QuiltMetadata);

            return metadata;
          });

          quiltAsyncAssetBaseUrl?.(() => quiltAssetBaseUrl!.run());

          quiltAsyncManifestPath?.(() =>
            project.fs.buildPath(
              `manifests/manifest${targetFilenamePart}.json`,
            ),
          );

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = false;
            return options;
          });

          rollupPlugins?.(async (plugins) => {
            const [{visualizer}, {cssRollupPlugin}, {systemJs}] =
              await Promise.all([
                import('rollup-plugin-visualizer'),
                import('./rollup/css'),
                import('./rollup/system-js'),
              ]);

            plugins.push(
              systemJs({minify: assets.minify}),
              cssRollupPlugin({
                minify: assets.minify,
                extract: true,
              }),
            );

            plugins.push({
              name: '@quilted/app/magic-entry',
              async resolveId(id) {
                if (
                  id === MAGIC_ENTRY_MODULE ||
                  id === MAGIC_MODULE_CUSTOM_ENTRY ||
                  id === MAGIC_MODULE_CUSTOM_INITIALIZE
                ) {
                  return {id, moduleSideEffects: 'no-treeshake'};
                }

                return null;
              },
              async load(source) {
                if (source === MAGIC_MODULE_CUSTOM_INITIALIZE) {
                  if (browser.initializeModule == null) {
                    throw new Error(
                      'Can’t load initialize module because browser.initializeModule was not provided',
                    );
                  }

                  return `import ${JSON.stringify(
                    project.fs.resolvePath(browser.initializeModule),
                  )}`;
                }

                if (source === MAGIC_MODULE_CUSTOM_ENTRY) {
                  if (browser.entryModule == null) {
                    throw new Error(
                      'Can’t load entry module because browser.entryModule was not provided',
                    );
                  }

                  return `import ${JSON.stringify(
                    project.fs.resolvePath(browser.entryModule),
                  )}`;
                }

                if (source !== MAGIC_ENTRY_MODULE) return null;

                let initialContent: string;

                if (browser.entryModule) {
                  initialContent = stripIndent`
                    ${
                      browser.initializeModule
                        ? `import ${JSON.stringify(
                            MAGIC_MODULE_CUSTOM_INITIALIZE,
                          )}`
                        : ''
                    }
                    import '@quilted/quilt/global';
                    import ${JSON.stringify(MAGIC_MODULE_CUSTOM_ENTRY)}
                  `;
                } else {
                  const [shouldHydrate, appCssSelector] = await Promise.all([
                    quiltAppBrowserEntryShouldHydrate!.run(server),
                    quiltAppBrowserEntryCssSelector!.run('#app'),
                  ]);

                  const reactFunction = shouldHydrate ? 'hydrate' : 'render';

                  initialContent = stripIndent`
                    ${
                      browser.initializeModule
                        ? `import ${JSON.stringify(
                            MAGIC_MODULE_CUSTOM_INITIALIZE,
                          )}`
                        : ''
                    }
                    import '@quilted/quilt/global';
                    import {${reactFunction}} from 'react-dom';
                    import App from ${JSON.stringify(
                      MAGIC_MODULE_APP_COMPONENT,
                    )};
      
                    ${reactFunction}(<App />, document.querySelector(${JSON.stringify(
                    appCssSelector,
                  )}));
                  `;
                }

                const content = await quiltAppBrowserEntryContent!.run(
                  initialContent,
                );

                return {
                  code: content,
                  moduleSideEffects: 'no-treeshake',
                };
              },
            });

            if (assets.minify) {
              const {terser} = await import('rollup-plugin-terser');
              plugins.push(terser({safari10: true, compress: true}));
            }

            plugins.push(
              visualizer({
                template: 'treemap',
                open: false,
                brotliSize: true,
                filename: project.fs.buildPath(
                  'reports',
                  `bundle-visualizer${targetFilenamePart}.html`,
                ),
              }),
            );

            return plugins;
          });

          rollupOutputs?.(async (outputs) => {
            const [dir, isESM] = await Promise.all([
              outputDirectory.run(project.fs.buildPath('assets')),
              browserTargets
                ? targetsSupportModules(browserTargets.targets)
                : Promise.resolve(true),
            ]);

            outputs.push({
              format: isESM ? 'esm' : 'systemjs',
              dir,
              entryFileNames: `app${targetFilenamePart}.[hash].js`,
              assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
              chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
              manualChunks: createManualChunksSorter(),
            });

            return outputs;
          });
        },
      );

      run(async (step, {configuration}) => {
        const steps: ReturnType<typeof step>[] = [];

        const {default: browserslist} = await import('browserslist');

        const foundConfig =
          browserslist.findConfig(project.root) ?? DEFAULT_BROWSERSLIST_CONFIG;

        const browserslistConfig: Record<string, string[]> = {};

        for (const [name, query] of Object.entries(foundConfig)) {
          browserslistConfig[name] = browserslist(query);
        }

        // We assume that the smallest set of browser targets is the highest priority,
        // since that usually means that the bundle sizes will be smaller.
        const targetsBySize = Object.values(browserslistConfig).sort(
          (targetsA, targetsB) => {
            return (targetsA?.length ?? 0) - (targetsB?.length ?? 0);
          },
        );

        for (const [name, targets] of Object.entries(browserslistConfig)) {
          if (targets == null || targets.length === 0) continue;

          const normalizedName = name === 'defaults' ? 'default' : name;

          steps.push(
            step({
              name: STEP_NAME,
              label: `Build app ${project.name} (browser targets: ${normalizedName})`,
              async run() {
                const [configure, {buildWithRollup}] = await Promise.all([
                  configuration({
                    quiltAppBrowser: {
                      name: normalizedName,
                      targets,
                      priority: targetsBySize.indexOf(targets),
                    },
                  }),
                  import('@quilted/sewing-kit-rollup'),
                ]);

                await Promise.all([
                  rm(project.fs.buildPath('assets'), {
                    recursive: true,
                    force: true,
                  }),
                  rm(project.fs.buildPath('server'), {
                    recursive: true,
                    force: true,
                  }),
                  rm(project.fs.buildPath('manifests'), {
                    recursive: true,
                    force: true,
                  }),
                  rm(project.fs.buildPath('reports'), {
                    recursive: true,
                    force: true,
                  }),
                ]);

                await buildWithRollup(configure);
              },
            }),
          );
        }

        return steps;
      });
    },
  });
}

let esmBrowserslist: Set<string>;

async function targetsSupportModules(targets: string[]) {
  if (esmBrowserslist == null) {
    const {default: browserslist} = await import('browserslist');

    esmBrowserslist = new Set(browserslist(BROWSERSLIST_MODULES_QUERY));
  }

  return targets.every((target) => esmBrowserslist.has(target));
}

const FRAMEWORK_CHUNK_NAME = 'framework';
const VENDOR_CHUNK_NAME = 'vendor';
const FRAMEWORK_TEST_STRINGS = [
  '/node_modules/preact/',
  '/node_modules/react/',
  '/node_modules/@quilted/',
];

// When building from source, quilt packages are not in node_modules,
// so we instead add their repo paths to the list of framework test strings.
if (process.env.SEWING_KIT_FROM_SOURCE) {
  FRAMEWORK_TEST_STRINGS.push('/quilt/packages/');
}

interface ImportMetadata {
  fromEntry: boolean;
  fromFramework: boolean;
}

// Inspired by Vite: https://github.com/vitejs/vite/blob/c69f83615292953d40f07b1178d1ed1d72abe695/packages/vite/src/node/build.ts#L567
function createManualChunksSorter(): GetManualChunk {
  const cache = new Map<string, ImportMetadata>();

  return (id, {getModuleInfo}) => {
    if (
      !id.includes('node_modules') &&
      !FRAMEWORK_TEST_STRINGS.some((test) => id.includes(test))
    ) {
      return;
    }

    // The @quilted/quilt/global is the only bit of side effect-ful code in Quilt.
    // That module needs to stay with app code so that it is executed in the
    // right order.
    if (/[/]quilt[/].*global\.\w+$/.test(id)) return;

    if (id.endsWith('.css')) return;

    const importMetadata = getImportMetadata(id, getModuleInfo, cache);

    if (!importMetadata.fromEntry) return;

    if (importMetadata.fromFramework) {
      return FRAMEWORK_CHUNK_NAME;
    }

    return VENDOR_CHUNK_NAME;
  };
}

function getImportMetadata(
  id: string,
  getModuleInfo: GetModuleInfo,
  cache: Map<string, ImportMetadata>,
  importStack: string[] = [],
): ImportMetadata {
  if (cache.has(id)) return cache.get(id)!;

  if (importStack.includes(id)) {
    // circular dependencies
    const result = {fromEntry: false, fromFramework: false};
    cache.set(id, result);
    return result;
  }

  const module = getModuleInfo(id);

  if (!module) {
    const result = {fromEntry: false, fromFramework: false};
    cache.set(id, result);
    return result;
  }

  if (module.isEntry) {
    const result = {fromEntry: true, fromFramework: false};
    cache.set(id, result);
    return result;
  }

  const newImportStack = [...importStack, id];
  const importersMetadata = module.importers.map((importer) =>
    getImportMetadata(importer, getModuleInfo, cache, newImportStack),
  );

  const result = {
    fromEntry: importersMetadata.some(({fromEntry}) => fromEntry),
    fromFramework:
      FRAMEWORK_TEST_STRINGS.some((test) => id.includes(test)) ||
      importersMetadata.some((importer) => importer.fromFramework),
  };

  cache.set(id, result);
  return result;
}
