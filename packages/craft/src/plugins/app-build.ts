import * as path from 'path';
import {rm} from 'fs/promises';

import type {GetModuleInfo, GetManualChunk} from 'rollup';
import type {Config as BrowserslistConfig} from 'browserslist';

import {createProjectPlugin, TargetRuntime, Runtime} from '@quilted/sewing-kit';
import type {App, WaterfallHookWithDefault} from '@quilted/sewing-kit';

import type {} from '@quilted/async/sewing-kit';

import type {Options as MagicBrowserEntryOptions} from './rollup/magic-browser-entry';

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

export type AppBrowserOptions = Pick<
  MagicBrowserEntryOptions,
  'entryModule' | 'initializeModule'
>;

export interface Options {
  server: boolean;
  static: boolean;
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
}

const BROWSERSLIST_MODULES_QUERY =
  'extends @quilted/browserslist-config/modules';

const DEFAULT_BROWSERSLIST_CONFIG: BrowserslistConfig = {
  defaults: ['extends @quilted/browserslist-config/defaults'],
  modules: [BROWSERSLIST_MODULES_QUERY],
  evergreen: ['extends @quilted/browserslist-config/evergreen'],
};

const DEFAULT_STATIC_BROWSERSLIST_CONFIG: BrowserslistConfig = {
  defaults: ['extends @quilted/browserslist-config/defaults'],
  modules: [BROWSERSLIST_MODULES_QUERY],
};

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

export function appBuild({server, static: isStatic, assets, browser}: Options) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    build({project, hooks, configure, run}) {
      hooks<AppBuildHooks>(({waterfall}) => ({
        quiltAssetBaseUrl: waterfall({
          default: assets.baseUrl,
        }),
      }));

      configure(
        (
          {
            runtime,
            targets,
            outputDirectory,
            rollupInput,
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
            const [{getUserAgentRegExp}, modules] = await Promise.all([
              import('browserslist-useragent-regexp'),
              targetsSupportModules(browserTargets.targets),
            ]);

            Object.assign(metadata, {
              priority: browserTargets.priority,
              browsers: getUserAgentRegExp({
                browsers: browserTargets.targets,
                ignoreMinor: true,
                ignorePatch: true,
                allowHigherVersions: true,
              }).source,
              modules,
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

          rollupPlugins?.(async (plugins) => {
            const [
              {visualizer},
              {magicBrowserEntry},
              {cssRollupPlugin},
              {systemJs},
            ] = await Promise.all([
              import('rollup-plugin-visualizer'),
              import('./rollup/magic-browser-entry'),
              import('./rollup/css'),
              import('./rollup/system-js'),
            ]);

            plugins.unshift(
              magicBrowserEntry({
                ...browser,
                project,
                module: MAGIC_ENTRY_MODULE,
                cssSelector: () => quiltAppBrowserEntryCssSelector!.run(),
                shouldHydrate: () => quiltAppBrowserEntryShouldHydrate!.run(),
                customizeContent: (content) =>
                  quiltAppBrowserEntryContent!.run(content),
              }),
            );

            plugins.push(
              systemJs({minify: assets.minify}),
              cssRollupPlugin({
                minify: assets.minify,
                extract: true,
              }),
            );

            if (assets.minify) {
              const {minify} = await import('rollup-plugin-esbuild');
              plugins.push(minify());
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
            const [outputRoot, isESM] = await Promise.all([
              outputDirectory.run(project.fs.buildPath()),
              browserTargets
                ? targetsSupportModules(browserTargets.targets)
                : Promise.resolve(true),
            ]);

            outputs.push({
              format: isESM ? 'esm' : 'systemjs',
              dir: path.join(outputRoot, isStatic ? 'public/assets' : 'assets'),
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
          browserslist.findConfig(project.root) ??
          (isStatic && !server
            ? DEFAULT_STATIC_BROWSERSLIST_CONFIG
            : DEFAULT_BROWSERSLIST_CONFIG);

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

        steps.push(
          step({
            stage: 'pre',
            name: `${STEP_NAME}.Clean`,
            label: `Cleaning build directory for ${project.name}`,
            async run() {
              await Promise.all([
                rm(project.fs.buildPath('assets'), {
                  recursive: true,
                  force: true,
                }),
                rm(project.fs.buildPath('public'), {
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
            },
          }),
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

                await buildWithRollup(project, configure);
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
const POLYFILLS_CHUNK_NAME = 'polyfills';
const VENDOR_CHUNK_NAME = 'vendor';
const UTILITIES_CHUNK_NAME = 'utilities';
const FRAMEWORK_TEST_STRINGS = [
  '/node_modules/preact/',
  '/node_modules/react/',
  '/node_modules/@quilted/',
];
const POLYFILL_TEST_STRINGS = ['/node_modules/core-js/'];
const COMMONJS_HELPER_MODULE = '\x00commonjsHelpers.js';

// When building from source, quilt packages are not in node_modules,
// so we instead add their repo paths to the list of framework test strings.
if (process.env.SEWING_KIT_FROM_SOURCE) {
  FRAMEWORK_TEST_STRINGS.push('/quilt/packages/');
}

interface ImportMetadata {
  fromEntry: boolean;
  fromFramework: boolean;
  fromPolyfills: boolean;
}

// Inspired by Vite: https://github.com/vitejs/vite/blob/c69f83615292953d40f07b1178d1ed1d72abe695/packages/vite/src/node/build.ts#L567
function createManualChunksSorter(): GetManualChunk {
  const cache = new Map<string, ImportMetadata>();

  return (id, {getModuleInfo}) => {
    if (id === COMMONJS_HELPER_MODULE) return UTILITIES_CHUNK_NAME;

    if (
      !id.includes('node_modules') &&
      !FRAMEWORK_TEST_STRINGS.some((test) => id.includes(test))
    ) {
      return;
    }

    if (id.endsWith('.css')) return;

    const importMetadata = getImportMetadata(id, getModuleInfo, cache);

    if (!importMetadata.fromEntry) return;

    if (importMetadata.fromFramework) {
      return FRAMEWORK_CHUNK_NAME;
    }

    if (importMetadata.fromPolyfills) {
      return POLYFILLS_CHUNK_NAME;
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
    const result: ImportMetadata = {
      fromEntry: false,
      fromFramework: false,
      fromPolyfills: false,
    };
    cache.set(id, result);
    return result;
  }

  const module = getModuleInfo(id);

  if (!module) {
    const result: ImportMetadata = {
      fromEntry: false,
      fromFramework: false,
      fromPolyfills: false,
    };
    cache.set(id, result);
    return result;
  }

  if (module.isEntry) {
    const result: ImportMetadata = {
      fromEntry: true,
      fromFramework: false,
      fromPolyfills: false,
    };
    cache.set(id, result);
    return result;
  }

  const newImportStack = [...importStack, id];
  const importersMetadata = module.importers.map((importer) =>
    getImportMetadata(importer, getModuleInfo, cache, newImportStack),
  );

  const result: ImportMetadata = {
    fromEntry: importersMetadata.some(({fromEntry}) => fromEntry),
    fromFramework: FRAMEWORK_TEST_STRINGS.some((test) => id.includes(test)),
    fromPolyfills: POLYFILL_TEST_STRINGS.some((test) => id.includes(test)),
  };

  cache.set(id, result);
  return result;
}
