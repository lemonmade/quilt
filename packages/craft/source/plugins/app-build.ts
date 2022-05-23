import * as path from 'path';
import {rm, readFile} from 'fs/promises';
import {createHash} from 'crypto';

import type {
  Plugin as RollupPlugin,
  GetModuleInfo,
  GetManualChunk,
} from 'rollup';
import type {Config as BrowserslistConfig} from 'browserslist';
import * as mime from 'mrmime';

import type {} from '../tools/postcss';
import type {} from '../features/async';
import {DEFAULT_STATIC_ASSET_EXTENSIONS} from '../constants';

import {createProjectPlugin, TargetRuntime, Runtime} from '../kit';
import type {App, WaterfallHookWithDefault} from '../kit';

import type {EnvironmentOptions} from './magic-module-env';
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

  /**
   * Controls how Quilt inlines assets into your bundles.
   */
  inline?:
    | boolean
    | {
        /**
         * The maximum size in bytes that an asset should be in order to
         * be inlined into the bundle. Defaults to `4096`.
         */
        limit?: number;
      };
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
  env?: EnvironmentOptions;
}

export interface AppBuildHooks {
  /**
   * The base URL for assets in this application. This value is used in the
   * Quilt asset manifest, during async loading, and by a number of other
   * additions to Quilt in order to correctly load assets.
   */
  quiltAssetBaseUrl: WaterfallHookWithDefault<string>;

  /**
   * The file extensions that will be considered as static assets. When you import these
   * files, Quilt will copy them to your output directory with the hash of the file contents
   * in the file name, and will replace the import with a URL pointing to this asset.
   */
  quiltAssetStaticExtensions: WaterfallHookWithDefault<readonly string[]>;

  /**
   * The file size limit for inlining static assets into your JavaScript bundles.
   * When you import a file that is less than this size, Quilt will convert it to
   * a bas64-encoded data URI; when the asset is larger than this size, it will
   * instead be output as an asset file, and Quilt will replace the import with
   * a URL pointing at that asset.
   *
   * Inlining images reduces network requests at the expense of a larger image size.
   * By default, this inlining is only performed for images less than 4KB, and is
   * never applied to SVG files.
   */
  quiltAssetStaticInlineLimit: WaterfallHookWithDefault<number>;

  /**
   * The pattern used when generating the file name for static assets being copied
   * to your output directory. By default, the output files will have the same file
   * name and extension as the input files, separated by the file’s content hash.
   */
  quiltAssetStaticOutputFilenamePattern: WaterfallHookWithDefault<string>;
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

export function appBuild({
  server,
  static: isStatic,
  assets,
  browser,
  env,
}: Options) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    build({project, hooks, configure, run}) {
      let assetsInline: Exclude<
        Options['assets']['inline'],
        boolean | undefined
      >;

      if (typeof assets.inline === 'boolean') {
        assetsInline = assets.inline ? {} : {limit: 0};
      } else {
        assetsInline = assets.inline ?? {};
      }

      hooks<AppBuildHooks>(({waterfall}) => ({
        quiltAssetBaseUrl: waterfall({
          default: assets.baseUrl,
        }),
        quiltAssetStaticExtensions: waterfall<readonly string[]>({
          default: () => [...DEFAULT_STATIC_ASSET_EXTENSIONS],
        }),
        quiltAssetStaticInlineLimit: waterfall({
          default: assetsInline.limit ?? 4096,
        }),
        quiltAssetStaticOutputFilenamePattern: waterfall({
          default: '[name].[hash].[ext]',
        }),
      }));

      configure(
        (
          {
            runtime,
            targets,
            outputDirectory,
            postcssPlugins,
            postcssProcessOptions,
            rollupInput,
            rollupOutputs,
            rollupPlugins,
            quiltAsyncManifestPath,
            quiltAsyncManifestMetadata,
            quiltAssetBaseUrl,
            quiltAssetStaticExtensions,
            quiltAssetStaticInlineLimit,
            quiltAssetStaticOutputFilenamePattern,
            quiltAsyncAssetBaseUrl,
            quiltAppBrowserEntryContent,
            quiltAppBrowserEntryShouldHydrate,
            quiltAppBrowserEntryCssSelector,
            quiltInlineEnvironmentVariables,
          },
          {quiltAppBrowser: browserTargets},
        ) => {
          const inlineEnv = env?.inline;

          if (inlineEnv != null && inlineEnv.length > 0) {
            quiltInlineEnvironmentVariables?.((variables) =>
              Array.from(new Set([...variables, ...inlineEnv])),
            );
          }

          rollupPlugins?.(async (plugins) => {
            const [baseUrl, extensions, inlineLimit, outputPattern] =
              await Promise.all([
                quiltAssetBaseUrl!.run(),
                quiltAssetStaticExtensions!.run(),
                quiltAssetStaticInlineLimit!.run(),
                quiltAssetStaticOutputFilenamePattern!.run(),
              ]);

            return [
              staticAssetsPlugin({
                // baseUrl:
                emit: Boolean(browserTargets),
                baseUrl,
                extensions,
                inlineLimit,
                outputPattern,
                name: (file) =>
                  path.posix.normalize(project.fs.relativePath(file)),
              }),
              ...plugins,
            ];
          });

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
                postcssPlugins: () => postcssPlugins!.run(),
                postcssProcessOptions: () => postcssProcessOptions!.run(),
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
            const [outputRoot, assetBaseUrl, isESM] = await Promise.all([
              outputDirectory.run(project.fs.buildPath()),
              quiltAssetBaseUrl!.run(),
              browserTargets
                ? targetsSupportModules(browserTargets.targets)
                : Promise.resolve(true),
            ]);

            const assetDirectory = assetBaseUrl.startsWith('/')
              ? assetBaseUrl.slice(1)
              : 'assets';

            outputs.push({
              format: isESM ? 'esm' : 'systemjs',
              dir: path.join(
                outputRoot,
                isStatic ? `public/${assetDirectory}` : assetDirectory,
              ),
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
                  import('../tools/rollup'),
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
const FRAMEWORK_TEST_STRINGS: (string | RegExp)[] = [
  '/node_modules/preact/',
  '/node_modules/react/',
  '/node_modules/js-cookie/',
  '/node_modules/@quilted/quilt/',
  // TODO I should turn this into an allowlist
  /node_modules[/]@quilted[/](?!react-query|swr)/,
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

// Inspired by Vite: https://github.com/vitejs/vite/blob/c69f83615292953d40f07b1178d1ed1d72abe695/packages/vite/source/node/build.ts#L567
function createManualChunksSorter(): GetManualChunk {
  const cache = new Map<string, ImportMetadata>();

  return (id, {getModuleInfo}) => {
    if (id === COMMONJS_HELPER_MODULE) return UTILITIES_CHUNK_NAME;

    if (
      !id.includes('node_modules') &&
      !FRAMEWORK_TEST_STRINGS.some((test) =>
        typeof test === 'string' ? id.includes(test) : test.test(id),
      )
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
    fromFramework: FRAMEWORK_TEST_STRINGS.some((test) =>
      typeof test === 'string' ? id.includes(test) : test.test(id),
    ),
    fromPolyfills: POLYFILL_TEST_STRINGS.some((test) => id.includes(test)),
  };

  cache.set(id, result);
  return result;
}

function staticAssetsPlugin({
  emit,
  name,
  baseUrl,
  extensions,
  inlineLimit,
  outputPattern,
}: {
  emit: boolean;
  baseUrl: string;
  extensions: readonly string[];
  inlineLimit: number;
  outputPattern: string;
  name(id: string): string;
}): RollupPlugin {
  const assetCache = new Map<string, string>();
  const assetMatcher = new RegExp(
    `\\.(` +
      extensions
        .map((extension) =>
          extension.startsWith('.') ? extension.slice(1) : extension,
        )
        .join('|') +
      `)(\\?.*)?$`,
  );

  return {
    name: '@quilt/assets',
    async load(id) {
      if (id.startsWith('\0') || !assetMatcher.test(id)) {
        return null;
      }

      const cached = assetCache.get(id);

      if (cached) {
        return cached;
      }

      const file = cleanModuleIdentifier(id);
      const content = await readFile(file);

      let url: string;

      if (!file.endsWith('.svg') && content.length < inlineLimit) {
        // base64 inlined as a string
        url = `data:${mime.lookup(file)};base64,${content.toString('base64')}`;
      } else {
        const contentHash = getHash(content);

        const filename = assetFileNamesToFileName(
          outputPattern,
          file,
          contentHash,
        );

        url = `${
          baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        }/${filename}`;

        if (emit) {
          this.emitFile({
            name: name(file),
            type: 'asset',
            fileName: filename,
            source: content,
          });
        }
      }

      const source = `export default ${JSON.stringify(url)};`;

      assetCache.set(id, source);

      return source;
    },
  };
}

function assetFileNamesToFileName(
  pattern: string,
  file: string,
  contentHash: string,
): string {
  const basename = path.basename(file);

  const extname = path.extname(basename);
  const ext = extname.substring(1);
  const name = basename.slice(0, -extname.length);
  const hash = contentHash;

  return pattern.replace(/\[\w+\]/g, (placeholder) => {
    switch (placeholder) {
      case '[ext]':
        return ext;

      case '[extname]':
        return extname;

      case '[hash]':
        return hash;

      case '[name]':
        return name;
    }
    throw new Error(
      `invalid placeholder ${placeholder} in assetFileNames "${pattern}"`,
    );
  });
}

function getHash(text: Buffer | string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 8);
}

const QUERY_PATTERN = /\?.*$/s;
const HASH_PATTERN = /#.*$/s;

function cleanModuleIdentifier(url: string) {
  return url.replace(HASH_PATTERN, '').replace(QUERY_PATTERN, '');
}
