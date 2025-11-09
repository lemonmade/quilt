import * as path from 'path';
import * as fs from 'fs/promises';
import {createRequire} from 'module';

import type {
  Plugin,
  RollupOptions,
  InputPluginOption,
  GetManualChunk,
} from 'rollup';
import type {AssetBuildManifest} from '@quilted/assets';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_HONO,
} from './constants.ts';
import {resolveEnvOption, type MagicModuleEnvOptions} from './features/env.ts';

import {multiline} from './shared/strings.ts';
import {
  getNodePlugins,
  removeBuildFiles,
  normalizeRollupInput,
  type RollupNodePluginOptions,
} from './shared/rollup.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';
import {
  getBrowserGroups,
  getBrowserGroupTargetDetails,
  getBrowserGroupRegularExpressions,
  targetsSupportModules,
  targetsSupportModuleWebWorkers,
  rollupGenerateOptionsForBrowsers,
  type BrowserGroupTargetSelection,
} from './shared/browserslist.ts';
import {Project} from './shared/project.ts';

import type {ServerRuntime, NodeServerRuntimeOptions} from './server.ts';

export interface AppBaseOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this app. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should just be
   * for the main `App` component in your project, which Quilt will automatically use
   * to create browser and server-side entries for your project.
   *
   * If you only want to use a custom entry module for the browser build, use the
   * `entry` option of the `quiltAppBrowser()` instead. If you only want to use a
   * custom entry module for the server-side build, use the `server.entry` option
   * instead.
   *
   * @example './App.tsx'
   */
  app?: string;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * Customizes the behavior of environment variables for your application. You
   * can further customize the environment variables provided to browser assets
   * by passing the `browser.env`, and those passed during server-side rendering
   * by passing `server.env`.
   */
  env?: MagicModuleEnvOptions | MagicModuleEnvOptions['mode'];
}

export interface AppOptions extends AppBaseOptions {
  /**
   * Customizes the browser build of your application.
   */
  browser?: Omit<AppBrowserOptions, keyof AppBaseOptions> &
    Pick<AppBrowserOptions, 'env'>;

  /**
   * Customizes the assets created for your application.
   */
  assets?: AppBrowserOptions['assets'];

  /**
   * Customizes the server build of your application.
   */
  server?:
    | boolean
    | (Omit<AppServerOptions, keyof AppBaseOptions> &
        Pick<AppServerOptions, 'env'>);

  /**
   * Customizes the service worker build of your application.
   */
  serviceWorker?: boolean | AppServiceWorkerOptions;

  /**
   * Customizations to the application for the runtime it will execute in.
   */
  runtime?: AppRuntime;
}

export interface AppBrowserOptions extends AppBaseOptions {
  /**
   * The entry module for this browser. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should be the
   * browser entrypoint. If you don’t provide a module, Quilt will automatically pick
   * a default entry module for you, based on the conventions [described here](TODO).
   *
   * @example './browser.tsx'
   */
  entry?: string;

  /**
   * Instead of providing a single `entry` module, you can use this option to list multiple
   * independent entry modules for your browser application. This can be useful if you have
   * parts of the codebase you want to load separately from one another; for example, as an
   * inline script or style, or assets loaded inside an iframe rendered by the “main” part of
   * the application.
   *
   * Entries should be defined similarly to how you would define the `exports` field in a Node.js
   * [`package.json` file](https://nodejs.org/api/packages.html#exports). Keys should be prefixed
   * with a `./`, and the key names can then be passed to Quilt’s `BrowserAssets` object to retrieve
   * the built asset names on your server. The values should be relative paths to the source file
   * that acts as the entrypoint for that asset. Entrypoints can be either JavaScript or CSS files.
   *
   * When using this option, you can override the “main” entrypoint by setting one of the keys
   * of this object to the string: `'.'`. You can do this in addition to providing additional
   * entry modules, but if you don’t provide the main entrypoint, a default will be used.
   *
   * @example
   * ```js
   * quiltApp({
   *   browser: {
   *     entries: {
   *       '.': './main.tsx',
   *       './styles.css': './styles.css',
   *     },
   *   },
   * })
   * ```
   *
   * To inline an asset, you can set the value to an object with a `source` property (for the relative
   * path) and an `inline` option set to `true`. Note that this option will not inline dependencies of
   * the entry into the asset manifest, so make sure that the way you load these scripts accounts for
   * the fact that any dependencies will be loaded as external scripts. Because the whole file’s contents
   * will be inlined into the asset manifest and server bundles, you should also be careful to only
   * inline small JavaScript and CSS assets.
   *
   * @example
   * ```js
   * quiltApp({
   *   browser: {
   *     entry: {
   *       '.': './main.tsx',
   *       './inline.js': {source: './inline.tsx', inline: true},
   *     },
   *   },
   * })
   * ```
   */
  entries?: Record<
    string,
    | string
    | {
        /**
         * The relative path to the source file that acts as the entrypoint for this asset.
         */
        source: string;

        /**
         * Whether to inline the asset into the asset manifest, so that it can be used as an
         * inline script or style when rendering HTML content on the server.
         *
         * @default false
         */
        inline?: boolean;
      }
  >;

  /**
   * Customizes the magic `quilt:module/entry` module, which can be used as a "magic"
   * entry for your application.
   */
  module?: AppBrowserModuleOptions;

  /**
   * Customizes the assets created for your application.
   */
  assets?: AppBrowserAssetsOptions;

  /**
   * Customizations to the application for the runtime it will execute in.
   */
  runtime?: Omit<AppRuntime, 'server'>;
}

export interface AppBrowserModuleOptions {
  /**
   * Whether the app should use hydration or client-side rendering.
   *
   * @default true
   */
  hydrate?: boolean;

  /**
   * The CSS selector to render or hydrate the application into.
   *
   * @default '#app'
   */
  selector?: string;
}

export interface AppBrowserAssetsOptions {
  /**
   * Whether to minify assets created for you application.
   *
   * @default true
   */
  minify?: boolean;

  directory?: string;
  baseURL?: string;
  targets?: BrowserGroupTargetSelection;
  priority?: number;

  /**
   * Whether to clean the output directory.
   *
   * @default true
   */
  clean?: boolean;

  /**
   * Controls how assets like images are inlined into your bundles JavaScript.
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

export interface AppServerOptions extends AppBaseOptions {
  /**
   * The entry module for this app’s server. By default, this module must export
   * a `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure. If you set the format to `'custom'`,
   * this entry can be any content — it will be bundled as-is.
   *
   * If not provided, this will default to a file named `server`, `service`,
   * or `backend` in your app’s root directory.
   */
  entry?: string;

  /**
   * Whether this server code uses `hono` to define itself in a generic way, which can
   * be adapted to a variety of environments. By default, this is `'hono'`, and when `'hono'`,
   * the `entry` you specified must export an `Hono` object as its default export. When set to `'custom'`,
   * the app server will be built as a basic server-side JavaScript project, without the special
   * `hono` adaptor.
   *
   * @default 'hono'
   */
  format?: 'hono' | 'custom';

  /**
   * Customizes the assets created for your application.
   */
  assets?: Pick<AppBrowserAssetsOptions, 'baseURL' | 'inline'>;

  /**
   * Customizes the output files created for your server.
   */
  output?: AppServerOutputOptions;

  /**
   * Customizations to the server for the runtime it will execute in.
   */
  runtime?: AppServerRuntime;
}

export interface AppServerOutputOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
  /**
   * Whether to minify assets created for this server.
   *
   * @default false
   */
  minify?: boolean;

  /**
   * Whether to add a hash to the output files for your server. You can set
   * this to `true`, which includes a hash for all files, `false`, which never
   * includes a hash, or `'async-only'`, which only includes a hash for files
   * that are loaded asynchronously (that is, your entry file will not have a
   * hash, but any files it loads will).
   *
   * @default 'async-only'
   */
  hash?: boolean | 'async-only';

  /**
   * Whether to clean the output directory.
   *
   * @default true
   */
  clean?: boolean;
}

export interface AppServiceWorkerOptions extends AppBaseOptions {
  /**
   * The entry module for this app’s service worker. By default, this module must export
   * a `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure. If you set the format to `'custom'`,
   * this entry can be any content — it will be bundled as-is.
   *
   * If not provided, this will default to a file named `server`, `service`,
   * or `backend` in your app’s root directory.
   */
  entry?: string;

  /**
   * Customizes the assets created for your application.
   */
  assets?: Pick<AppBrowserAssetsOptions, 'baseURL' | 'inline'>;

  /**
   * Customizes the output files created for your service worker.
   */
  output?: AppServiceWorkerOutputOptions;

  /**
   * Customizes the behavior of environment variables for your application.
   */
  env?: MagicModuleEnvOptions | MagicModuleEnvOptions['mode'];
}

export interface AppServiceWorkerOutputOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
  /**
   * Whether to minify assets created for this service worker.
   *
   * @default false
   */
  minify?: boolean;

  /**
   * Whether to add a hash to the output files for your service worker. You can set
   * this to `true`, which includes a hash for all files, `false`, which never
   * includes a hash, or `'async-only'`, which only includes a hash for files
   * that are loaded asynchronously (that is, your entry file will not have a
   * hash, but any files it loads will).
   *
   * @default 'async-only'
   */
  hash?: boolean | 'async-only';
}

export interface AppRuntime {
  /**
   * Overrides to the assets for this application.
   */
  assets?: {
    /**
     * The directory to output the application’s assets into.
     */
    directory?: string;
  };

  /**
   * Customizations to the server for this runtime.
   */
  server?: AppServerRuntime;

  /**
   * Customizations to the browser build for this runtime.
   */
  browser?: {
    /**
     * Provides additional Rollup options to customize the server build.
     * This function receives the current Rollup options and can return
     * modified options or a partial override.
     */
    rollup?(options: RollupOptions): InputPluginOption;
  };
}

export interface AppServerRuntime extends Omit<ServerRuntime, 'hono'> {
  hono?(): string;
}

export {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_HONO,
};

const require = createRequire(import.meta.url);

export async function quiltApp({
  root = process.cwd(),
  app,
  env,
  graphql,
  assets,
  browser: browserOptions,
  server: serverOptions = true,
  serviceWorker: serviceWorkerOptions = false,
  runtime,
}: AppOptions = {}) {
  const project = Project.load(root);

  const browserGroups = await getBrowserGroups({root: project.root});
  const browserGroupEntries = Object.entries(browserGroups);
  const hasMultipleBrowserGroups = browserGroupEntries.length > 1;

  const optionPromises: Promise<RollupOptions>[] = [];

  browserGroupEntries.forEach(([name, browsers], index) => {
    optionPromises.push(
      quiltAppBrowser({
        root: project.root,
        app,
        graphql,
        runtime,
        ...browserOptions,
        env: {
          ...resolveEnvOption(env),
          ...resolveEnvOption(browserOptions?.env),
        },
        assets: {
          ...assets,
          ...browserOptions?.assets,
          // Only clean on the first build, otherwise each subsequent build removes
          // assets from the previous ones.
          clean: index === 0,
          priority: index,
          targets: hasMultipleBrowserGroups ? {name, browsers} : browsers,
        },
      }),
    );
  });

  if (serverOptions) {
    const serverOptionsObject =
      typeof serverOptions === 'object' ? serverOptions : {};

    optionPromises.push(
      quiltAppServer({
        root: project.root,
        app,
        graphql,
        runtime: runtime?.server,
        ...serverOptionsObject,
        env: {
          ...resolveEnvOption(env),
          ...resolveEnvOption(serverOptionsObject?.env),
        },
        assets: {...assets, ...serverOptionsObject?.assets},
      }),
    );
  }

  if (serviceWorkerOptions) {
    const serviceWorkerOptionsObject =
      typeof serviceWorkerOptions === 'object' ? serviceWorkerOptions : {};

    optionPromises.push(
      quiltAppServiceWorker({
        root: project.root,
        app,
        graphql,
        ...serviceWorkerOptionsObject,
        env: {
          ...resolveEnvOption(env),
          ...resolveEnvOption(serviceWorkerOptionsObject?.env),
        },
        assets: {...assets, ...serviceWorkerOptionsObject?.assets},
      }),
    );
  }

  return Promise.all(optionPromises);
}

export async function quiltAppBrowser(options: AppBrowserOptions = {}) {
  const {root = process.cwd(), assets, runtime} = options;
  const project = Project.load(root);

  const [plugins, browserGroup] = await Promise.all([
    quiltAppBrowserPlugins(options),
    getBrowserGroupTargetDetails(assets?.targets, {
      root: project.root,
    }),
  ]);

  const targetFilenamePart = browserGroup.name ? `.${browserGroup.name}` : '';
  const [isESM, generatedCode] = await Promise.all([
    targetsSupportModules(browserGroup.browsers),
    rollupGenerateOptionsForBrowsers(browserGroup.browsers),
  ]);

  const rollupOptions = {
    plugins,
    output: {
      format: isESM ? 'esm' : 'systemjs',
      dir: project.resolve(
        assets?.directory ?? runtime?.assets?.directory ?? `build/assets`,
      ),
      entryFileNames: `[name]${targetFilenamePart}.[hash].js`,
      assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
      chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
      manualChunks: createManualChunksSorter(),
      generatedCode,
      // This optimization is performed in `AsyncModule` instead.
      hoistTransitiveImports: false,
      minifyInternalExports: true,
    },
    preserveEntrySignatures: false,
  } satisfies RollupOptions;

  if (runtime?.browser?.rollup) {
    rollupOptions.plugins.push(runtime.browser.rollup(rollupOptions));
  }

  return rollupOptions;
}

export async function quiltAppBrowserPlugins({
  root = process.cwd(),
  app,
  entry,
  entries,
  env,
  assets,
  module,
  graphql = true,
}: AppBrowserOptions = {}) {
  const project = Project.load(root);
  const mode = (typeof env === 'object' ? env?.mode : env) ?? 'production';
  const minify = assets?.minify ?? mode === 'production';
  const baseURL = assets?.baseURL ?? '/assets/';
  const assetsInline = assets?.inline ?? true;

  const assetsDirectory = project.resolve('build/assets');
  const reportsDirectory = path.join(assetsDirectory, '../reports');
  const manifestsDirectory = path.join(assetsDirectory, '../manifests');

  const browserGroup = await getBrowserGroupTargetDetails(assets?.targets, {
    root: project.root,
  });
  const targetFilenamePart = browserGroup.name ? `.${browserGroup.name}` : '';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {tsconfigAliases},
    {monorepoPackageAliases},
    {react},
    {css},
    {assetManifest, rawAssets, staticAssets},
    {asyncModules},
    {systemJS},
    {workers},
    {esnext},
    nodePlugins,
    supportsESM,
    supportsModuleWorkers,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/node.ts'),
    import('./features/react.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/async.ts'),
    import('./features/system-js.ts'),
    import('./features/workers.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({
      bundle: true,
      resolve: {exportConditions: ['browser']},
    }),
    targetsSupportModules(browserGroup.browsers),
    targetsSupportModuleWebWorkers(browserGroup.browsers),
  ]);

  const plugins: InputPluginOption[] = [
    quiltAppBrowserInput({root: project.root, entry, entries}),
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({...resolveEnvOption(env), mode, root: project.root}),
    magicModuleAppComponent({entry: app, root: project.root}),
    magicModuleAppBrowserEntry(module),
    sourceCode({
      mode,
      targets: browserGroup.browsers,
      babel: {
        useBuiltIns: 'entry',
        options(options) {
          return {
            ...options,
            plugins: [
              ...(options?.plugins ?? []),
              require.resolve('@quilted/babel/async'),
              require.resolve('@quilted/babel/workers'),
            ],
          };
        },
      },
    }),
    react(),
    css({minify, emit: true}),
    esnext({
      mode,
      targets: browserGroup.browsers,
    }),
    rawAssets(),
    staticAssets({
      baseURL,
      emit: true,
      inlineLimit: assetsInline
        ? typeof assetsInline === 'boolean'
          ? undefined
          : assetsInline?.limit
        : Number.POSITIVE_INFINITY,
    }),
    asyncModules({
      baseURL,
      preload: true,
      moduleID: ({imported}) => path.relative(project.root, imported),
    }),
    workers({
      baseURL,
      format: supportsModuleWorkers ? 'module' : 'classic',
      outputOptions: {
        dir: assetsDirectory,
        entryFileNames: `[name]${targetFilenamePart}.[hash].js`,
        assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
        chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
      },
    }),
    tsconfigAliases({root: project.root}),
    monorepoPackageAliases({root: project.root}),
  ];

  if (!supportsESM) {
    plugins.push(systemJS({minify}));
  }

  if (assets?.clean ?? true) {
    plugins.push(
      removeBuildFiles(
        [assetsDirectory, manifestsDirectory, reportsDirectory],
        {
          root: project.root,
        },
      ),
    );
  }

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');

    plugins.push(
      graphql({
        manifest: path.join(
          manifestsDirectory,
          `graphql${targetFilenamePart}.json`,
        ),
      }),
    );
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');

    plugins.push(minify());
  }

  const cacheKey = new URLSearchParams();
  if (browserGroup.name) {
    cacheKey.set('browserGroup', browserGroup.name);
  }

  // Always inline the system.js entry, since we’ll load it as an inline script to avoid
  // an unnecessary JS network waterfall for loading critical, SystemJS-dependent code.
  // We’ll also add any additional entry that was passed via the `entries` option that is
  // marked as being `inline`.
  const inline = new Set(['system.js']);

  if (entries) {
    for (const [name, entry] of Object.entries(entries)) {
      if (typeof entry === 'object' && entry.inline) {
        const bareName = name.startsWith('./') ? name.slice(2) : name;

        inline.add(
          bareName === '.'
            ? path
                .basename(getSourceFromCustomEntry(entry)!)
                .split('.')
                .slice(0, -1)
                .join('.')
            : bareName,
        );
      }
    }
  }

  plugins.push(
    assetManifest({
      key: cacheKey,
      base: baseURL,
      file: path.join(manifestsDirectory, `assets${targetFilenamePart}.json`),
      priority: assets?.priority,
      inline,
    }),
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: path.join(
        reportsDirectory,
        `bundle-visualizer${targetFilenamePart}.html`,
      ),
    }),
  );

  return plugins;
}

export function quiltAppBrowserInput({
  root,
  entry,
  entries,
}: Pick<AppBrowserOptions, 'root' | 'entry' | 'entries'> = {}) {
  const MODULES_TO_ENTRIES = new Map<string, string>();

  return {
    name: '@quilted/app-browser/input',
    async options(options) {
      const finalEntry =
        normalizeRollupInput(options.input) ??
        (await sourceEntryForAppBrowser({
          entry: entry ?? getSourceFromCustomEntry(entries?.['.']),
          root,
        })) ??
        MAGIC_MODULE_ENTRY;
      const finalEntryName =
        typeof finalEntry === 'string' && finalEntry !== MAGIC_MODULE_ENTRY
          ? path.basename(finalEntry).split('.').slice(0, -1).join('.')
          : 'browser';
      const additionalEntries = await additionalEntriesForAppBrowser({
        root,
        entries,
      });

      if (typeof finalEntry === 'string') {
        MODULES_TO_ENTRIES.set(finalEntry, '.');
      }

      for (const [name, entry] of Object.entries(additionalEntries)) {
        MODULES_TO_ENTRIES.set(entry, `./${name}`);
      }

      return {
        ...options,
        // If we are using the "magic entry", give it an explicit name of `browser`.
        // Otherwise, Rollup will use the file name as the output name.
        input:
          typeof finalEntry === 'string'
            ? {...additionalEntries, [finalEntryName]: finalEntry}
            : Array.isArray(finalEntry)
              ? finalEntry
              : {...additionalEntries, ...finalEntry},
      };
    },
    resolveId(source, importer, options) {
      const entry = MODULES_TO_ENTRIES.get(source);
      if (entry == null) return null;

      return this.resolve(source, importer, {...options, skipSelf: true}).then(
        (resolved) => {
          return resolved
            ? {...resolved, meta: {...resolved.meta, quilt: {entry}}}
            : resolved;
        },
      );
    },
  } satisfies Plugin;
}

export async function quiltAppServer(options: AppServerOptions = {}) {
  const {
    output,
    root = process.cwd(),
    runtime = nodeAppServerRuntime() as AppServerRuntime,
  } = options;

  const project = Project.load(root);
  const hash = output?.hash ?? 'async-only';
  const format = runtime.output?.format ?? 'esm';

  const plugins = await quiltAppServerPlugins({...options, root, runtime});

  return {
    plugins,
    output: {
      format: format === 'cjs' || format === 'commonjs' ? 'commonjs' : 'esm',
      dir: project.resolve(runtime.output?.directory ?? `build/server`),
      entryFileNames: `[name]${hash === true ? `.[hash]` : ''}.js`,
      chunkFileNames: `[name]${
        hash === true || hash === 'async-only' ? `.[hash]` : ''
      }.js`,
      assetFileNames: `[name]${hash === true ? `.[hash]` : ''}.[ext]`,
      generatedCode: 'es2015',
      ...runtime.output?.options,
    },
  } satisfies RollupOptions;
}

export async function quiltAppServerPlugins({
  root = process.cwd(),
  app,
  env,
  entry,
  format = 'hono',
  graphql = true,
  assets,
  output,
  runtime = nodeAppServerRuntime(),
}: AppServerOptions = {}) {
  const project = Project.load(root);
  const mode = (typeof env === 'object' ? env?.mode : env) ?? 'production';

  const baseURL = assets?.baseURL ?? '/assets/';
  const assetsInline = assets?.inline ?? true;

  const outputDirectory = project.resolve(
    runtime.output?.directory ?? 'build/server',
  );
  const reportsDirectory = path.resolve(outputDirectory, '../reports');

  const bundle = output?.bundle ?? runtime.output?.bundle;
  const minify = output?.minify ?? false;
  const clean = output?.clean ?? runtime?.output?.clean ?? true;

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {react},
    {tsconfigAliases},
    {monorepoPackageAliases},
    {css},
    {rawAssets, staticAssets},
    {asyncModules},
    {esnext},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/react.ts'),
    import('./features/typescript.ts'),
    import('./features/node.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/async.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({
      bundle,
      resolve: {exportConditions: runtime.resolve?.exportConditions},
    }),
  ]);

  const plugins: InputPluginOption[] = [
    quiltAppServerInput({root: project.root, entry, format}),
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({
      runtime: runtime.env,
      ...resolveEnvOption(env),
      mode,
      root: project.root,
    }),
    magicModuleAppComponent({entry: app, root: project.root}),
    createMagicModulePlugin({
      name: '@quilted/hono',
      sideEffects: true,
      module: MAGIC_MODULE_ENTRY,
      source() {
        return runtime.hono?.() ?? nodeAppServerRuntime().hono();
      },
    }),
    magicModuleAppRequestRouter({entry, root: project.root}),
    magicModuleAppAssetManifests(),
    sourceCode({
      mode,
      targets: ['current node'],
      babel: {
        options(options) {
          return {
            ...options,
            plugins: [
              ...(options?.plugins ?? []),
              require.resolve('@quilted/babel/async'),
              [require.resolve('@quilted/babel/workers'), {noop: true}],
            ],
          };
        },
      },
    }),
    react(),
    esnext({
      mode,
      targets: ['current node'],
    }),
    css({emit: false, minify}),
    rawAssets(),
    staticAssets({
      emit: false,
      baseURL,
      inlineLimit: assetsInline
        ? typeof assetsInline === 'boolean'
          ? undefined
          : assetsInline?.limit
        : Number.POSITIVE_INFINITY,
    }),
    asyncModules({
      baseURL,
      preload: false,
      moduleID: ({imported}) => path.relative(project.root, imported),
    }),
    tsconfigAliases({root: project.root}),
    monorepoPackageAliases({root: project.root}),
  ];

  if (clean) {
    plugins.push(removeBuildFiles([outputDirectory], {root: project.root}));
  }

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: false,
      filename: path.join(reportsDirectory, `bundle-visualizer.server.html`),
    }),
  );

  return plugins;
}

export function quiltAppServerInput({
  root = process.cwd(),
  entry,
  format = 'hono',
}: Pick<AppServerOptions, 'root' | 'entry' | 'format'> = {}) {
  return {
    name: '@quilted/app-server/input',
    async options(options) {
      const serverEntry =
        normalizeRollupInput(options.input) ??
        (await sourceEntryForAppServer({entry, root}));
      const finalEntry =
        format === 'hono'
          ? MAGIC_MODULE_ENTRY
          : (serverEntry ?? MAGIC_MODULE_ENTRY);
      const finalEntryName =
        typeof serverEntry === 'string'
          ? path.basename(serverEntry).split('.').slice(0, -1).join('.')
          : 'server';

      return {
        ...options,
        input:
          typeof finalEntry === 'string'
            ? {[finalEntryName]: finalEntry}
            : finalEntry,
      };
    },
  } satisfies Plugin;
}

export async function quiltAppServiceWorker(
  options: AppServiceWorkerOptions = {},
) {
  const {output, root = process.cwd()} = options;

  const project = Project.load(root);
  const hash = output?.hash ?? 'async-only';

  const plugins = await quiltAppServiceWorkerPlugins({
    ...options,
    root,
  });

  return {
    plugins,
    output: {
      format: 'iife',
      dir: project.resolve(`build/service-worker`),
      entryFileNames: `[name]${hash === true ? `.[hash]` : ''}.js`,
      chunkFileNames: `[name]${
        hash === true || hash === 'async-only' ? `.[hash]` : ''
      }.js`,
      assetFileNames: `[name]${hash === true ? `.[hash]` : ''}.[ext]`,
      generatedCode: 'es2015',
    },
  } satisfies RollupOptions;
}

export async function quiltAppServiceWorkerPlugins({
  root = process.cwd(),
  app,
  env,
  entry,
  graphql = true,
  assets,
  output,
}: AppServiceWorkerOptions = {}) {
  const project = Project.load(root);
  const mode = (typeof env === 'object' ? env?.mode : env) ?? 'production';

  const baseURL = assets?.baseURL ?? '/assets/';
  const assetsInline = assets?.inline ?? true;

  const outputDirectory = project.resolve('build/service-worker');
  const reportsDirectory = path.resolve(outputDirectory, '../reports');

  const bundle = output?.bundle;
  const minify = output?.minify ?? false;

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {react},
    {tsconfigAliases},
    {monorepoPackageAliases},
    {css},
    {rawAssets, staticAssets},
    {asyncModules},
    {esnext},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/react.ts'),
    import('./features/typescript.ts'),
    import('./features/node.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/async.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({
      bundle,
      resolve: {exportConditions: ['browser']},
    }),
  ]);

  const plugins: InputPluginOption[] = [
    quiltAppServiceWorkerInput({root: project.root, entry}),
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({
      ...resolveEnvOption(env),
      mode,
      root: project.root,
    }),
    magicModuleAppComponent({entry: app, root: project.root}),
    magicModuleAppAssetManifests(),
    sourceCode({
      mode,
      // TODO
      targets: ['defaults and not dead'],
      babel: {
        options(options) {
          return {
            ...options,
            plugins: [
              ...(options?.plugins ?? []),
              require.resolve('@quilted/babel/async'),
              [require.resolve('@quilted/babel/workers'), {noop: true}],
            ],
          };
        },
      },
    }),
    react(),
    esnext({
      mode,
      // TODO
      targets: ['defaults and not dead'],
    }),
    css({emit: false, minify}),
    rawAssets(),
    staticAssets({
      emit: false,
      baseURL,
      inlineLimit: assetsInline
        ? typeof assetsInline === 'boolean'
          ? undefined
          : assetsInline?.limit
        : Number.POSITIVE_INFINITY,
    }),
    asyncModules({
      baseURL,
      preload: false,
      moduleID: ({imported}) => path.relative(project.root, imported),
    }),
    removeBuildFiles([outputDirectory], {root: project.root}),
    tsconfigAliases({root: project.root}),
    monorepoPackageAliases({root: project.root}),
  ];

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: false,
      filename: path.join(
        reportsDirectory,
        `bundle-visualizer.service-worker.html`,
      ),
    }),
  );

  return plugins;
}

export function quiltAppServiceWorkerInput({
  root = process.cwd(),
  entry,
}: Pick<AppServiceWorkerOptions, 'root' | 'entry'> = {}) {
  return {
    name: '@quilted/app-server/input',
    async options(options) {
      const serviceWorkerEntry =
        normalizeRollupInput(options.input) ??
        (await sourceEntryForAppServiceWorker({entry, root}));

      if (serviceWorkerEntry == null) {
        throw new Error(
          `No service worker entry found. Please provide a \`service.entry\` option pointing to your service worker’s source code.`,
        );
      }

      const finalEntryName =
        typeof serviceWorkerEntry === 'string'
          ? path.basename(serviceWorkerEntry).split('.').slice(0, -1).join('.')
          : 'service-worker';

      return {
        ...options,
        input:
          typeof serviceWorkerEntry === 'string'
            ? {[finalEntryName]: serviceWorkerEntry}
            : serviceWorkerEntry,
      };
    },
  } satisfies Plugin;
}

export interface NodeAppServerRuntimeOptions extends NodeServerRuntimeOptions {}

export function nodeAppServerRuntime({
  host,
  port,
  format = 'module',
}: NodeAppServerRuntimeOptions = {}) {
  const rollupFormat =
    format === 'commonjs' || format === 'cjs' ? 'cjs' : 'esm';

  return {
    env: 'process.env',
    output: {
      options: {
        format: rollupFormat,
      },
    },
    hono() {
      return multiline`
        import app from ${JSON.stringify(MAGIC_MODULE_HONO)};
        import {serve} from '@quilted/quilt/hono/node';

        const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
        const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};

        serve({fetch: app.fetch, port, hostname: host});
      `;
    },
  } satisfies AppServerRuntime;
}

export function magicModuleAppComponent({
  entry,
  root = process.cwd(),
}: {
  entry?: string;
  root?: string | URL;
}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app',
    module: MAGIC_MODULE_APP_COMPONENT,
    alias:
      entry ??
      async function magicModuleApp() {
        const project = Project.load(root);

        const globbed = await project.glob(
          '{App,app,index}.{ts,tsx,mjs,js,jsx}',
          {
            nodir: true,
            absolute: true,
          },
        );

        return globbed[0]!;
      },
  });
}

export function magicModuleAppRequestRouter({
  entry,
  root = process.cwd(),
}: Pick<AppServerOptions, 'entry' | 'root'> = {}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app-hono',
    module: MAGIC_MODULE_HONO,
    alias: () => sourceEntryForAppServer({entry, root}) as Promise<string>,
    async source() {
      return multiline`
        import {Hono} from 'hono';
        import {jsx} from 'preact/jsx-runtime';
        import {renderAppToHTMLResponse} from '@quilted/quilt/server';

        import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
        import {BrowserAssets} from ${JSON.stringify(
          MAGIC_MODULE_BROWSER_ASSETS,
        )};

        const app = new Hono();
        const assets = new BrowserAssets();

        app.get(async (c) => {
          const request = c.req.raw;
          const response = await renderAppToHTMLResponse(jsx(App), {
            request,
            assets,
          });

          return response;
        });

        export default app;
      `;
    },
  });
}

export function magicModuleAppBrowserEntry({
  hydrate = true,
  selector = '#app',
}: AppBrowserModuleOptions = {}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app-browser-entry',
    module: MAGIC_MODULE_ENTRY,
    sideEffects: true,
    async source() {
      const reactRootFunction = hydrate ? 'hydrate' : 'render';

      return multiline`
        import {jsx} from 'preact/jsx-runtime';
        import {${reactRootFunction}} from 'preact';

        import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};

        const element = document.querySelector(${JSON.stringify(selector)});

        ${reactRootFunction}(jsx(App), element);
      `;
    },
  });
}

export function magicModuleAppAssetManifests() {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/asset-manifests',
    module: MAGIC_MODULE_BROWSER_ASSETS,
    async source() {
      const {glob} = await import('glob');

      const manifestFiles = await glob('assets*.json', {
        nodir: true,
        absolute: true,
        cwd: path.resolve(`build/manifests`),
      });

      const manifests = await Promise.all(
        manifestFiles.map(
          async (file) =>
            JSON.parse(await fs.readFile(file, 'utf8')) as AssetBuildManifest,
        ),
      );

      manifests.sort(
        (manifestA, manifestB) =>
          (manifestA.priority ?? 0) - (manifestB.priority ?? 0),
      );

      const browserGroupRegexes = await getBrowserGroupRegularExpressions();

      return multiline`
        import {BrowserAssetsFromManifests} from '@quilted/quilt/server';

        export class BrowserAssets extends BrowserAssetsFromManifests {
          constructor() {
            const manifests = JSON.parse(${JSON.stringify(
              JSON.stringify(manifests),
            )});

            const browserGroupTests = [
              ${Object.entries(browserGroupRegexes)
                .map(
                  ([name, test]) =>
                    `[${JSON.stringify(name)}, new RegExp(${JSON.stringify(
                      test.source,
                    )})]`,
                )
                .join(', ')}
            ];

            // The default manifest is the last one, since it has the widest browser support.
            const defaultManifest = manifests.at(-1);

            super(manifests, {
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
        }
      `;
    },
  });
}

export async function sourceEntryForAppBrowser({
  entry,
  root = process.cwd(),
}: {
  entry?: string;
  root?: string | URL;
}) {
  const project = Project.load(root);

  if (entry) {
    return project.resolve(entry);
  } else {
    const {packageJSON} = project;

    // If we have a `main` or `browser` field in our `package.json`, use that
    // as the browser entry.
    if (typeof packageJSON.raw.main === 'string') {
      return project.resolve(packageJSON.raw.main);
    }

    if (typeof packageJSON.raw.browser === 'string') {
      return project.resolve(packageJSON.raw.browser);
    }

    // Try `package.json` `exports` field, if it’s a string or an object with export conditions
    let currentEntry = packageJSON.raw.exports as any;
    let resolvedEntryFromExports = resolveExportsField(
      project,
      currentEntry,
      BROWSER_EXPORT_CONDITIONS,
    );

    if (resolvedEntryFromExports) return resolvedEntryFromExports;

    // Then, try `exports[.]`, if it’s a string or an object with export conditions
    currentEntry = currentEntry?.['.'];
    resolvedEntryFromExports = resolveExportsField(
      project,
      currentEntry,
      BROWSER_EXPORT_CONDITIONS,
    );

    if (resolvedEntryFromExports) return resolvedEntryFromExports;

    // If we don’t have an entry yet, try the default file names
    const files = await project.glob(
      '{browser,client,web}.{ts,tsx,mjs,js,jsx}',
      {
        nodir: true,
        absolute: true,
      },
    );

    return files[0];
  }
}

const BROWSER_EXPORT_CONDITIONS = new Set([
  'browser',
  'source',
  'quilt:source',
  'default',
]);
const SERVER_EXPORT_CONDITIONS = new Set([
  'server',
  'source',
  'quilt:source',
  'default',
]);

export async function additionalEntriesForAppBrowser({
  entries,
  root = process.cwd(),
}: {
  entries?: AppBrowserOptions['entries'];
  root?: string | URL;
}) {
  const additionalEntries: Record<string, string> = {};

  const project = Project.load(root);
  const exports = project.packageJSON.raw.exports as any;

  if (typeof exports === 'object' && exports != null) {
    for (const [key, value] of Object.entries(exports)) {
      // skip anything other than entries
      if (!key.startsWith('.')) continue;

      // Skip the `.` key, since it’s not an additional entry
      if (key === '.') continue;

      const resolvedEntry = resolveExportsField(
        project,
        value as any,
        BROWSER_EXPORT_CONDITIONS,
      );

      if (resolvedEntry) {
        additionalEntries[key.slice(2)] = resolvedEntry;
      }
    }
  }

  if (entries) {
    for (const [key, value] of Object.entries(entries)) {
      if (key === '.') continue;

      const name = key.startsWith('./') ? key.slice(2) : key;

      if (typeof value === 'string') {
        additionalEntries[name] = project.resolve(value);
      } else {
        additionalEntries[name] = project.resolve(value.source);
      }
    }
  }

  return additionalEntries;
}

function resolveExportsField(
  project: Project,
  entry:
    | string
    | null
    | undefined
    | Record<string, string | null | undefined | Record<string, unknown>>,
  conditions: Set<string>,
) {
  if (typeof entry === 'string') {
    return project.resolve(entry);
  } else if (typeof entry === 'object' && entry != null) {
    for (const [condition, value] of Object.entries(entry)) {
      if (conditions.has(condition) && typeof value === 'string') {
        return project.resolve(value);
      }
    }
  }
}

export async function sourceEntryForAppServer({
  entry,
  root = process.cwd(),
}: {
  entry?: string;
  root?: string | URL;
}) {
  const project = Project.load(root);

  if (entry) {
    return project.resolve(entry);
  }
  {
    const {packageJSON} = project;

    // Try `package.json` `exports` field, if it has a `server` condition or a `.`
    // enrty with a `server` condition
    const exports = packageJSON.raw.exports as any;

    const resolvedFromRootServerEntry = resolveExportsField(
      project,
      exports?.['server'] ?? exports?.['.']?.['server'],
      SERVER_EXPORT_CONDITIONS,
    );
    if (resolvedFromRootServerEntry) return resolvedFromRootServerEntry;

    const files = await project.glob(
      '{server,service,backend}.{ts,tsx,mjs,js,jsx}',
      {
        nodir: true,
        absolute: true,
      },
    );

    return files[0];
  }
}

export async function sourceEntryForAppServiceWorker({
  entry,
  root = process.cwd(),
}: {
  entry?: string;
  root?: string | URL;
}) {
  const project = Project.load(root);

  if (entry) {
    return project.resolve(entry);
  } else {
    const files = await project.glob(
      '{sw,service-worker}.{ts,tsx,mjs,js,jsx}',
      {
        nodir: true,
        absolute: true,
      },
    );

    return files[0];
  }
}

const FRAMEWORK_CHUNK_NAME = 'framework';
const POLYFILLS_CHUNK_NAME = 'polyfills';
const VENDOR_CHUNK_NAME = 'vendor';
const INTERNALS_CHUNK_NAME = 'internals';
const SHARED_CHUNK_NAME = 'shared';
const PACKAGES_CHUNK_NAME = 'packages';
const GLOBAL_CHUNK_NAME = 'global';
const FRAMEWORK_TEST_STRINGS: (string | RegExp)[] = [
  '/node_modules/preact/',
  '/node_modules/react/',
  '/node_modules/js-cookie/',
  '/node_modules/@quilted/quilt/',
  '/node_modules/@preact/signals/',
  '/node_modules/@preact/signals-core/',
  // TODO I should turn this into an allowlist
  /node_modules[/]@quilted[/](?!react-query|swr)/,
];

const POLYFILL_TEST_STRINGS = [
  '/node_modules/core-js/',
  '/node_modules/whatwg-fetch/',
  '/node_modules/regenerator-runtime/',
  '/node_modules/abort-controller/',
];

const INTERNALS_TEST_STRINGS = [
  '\x00commonjsHelpers.js',
  '/node_modules/@babel/runtime/',
];

// When building from source, quilt packages are not in node_modules,
// so we instead add their repo paths to the list of framework test strings.
if (process.env.QUILT_FROM_SOURCE) {
  FRAMEWORK_TEST_STRINGS.push('/quilt/packages/');
}

// Inspired by Vite: https://github.com/vitejs/vite/blob/c69f83615292953d40f07b1178d1ed1d72abe695/packages/vite/source/node/build.ts#L567
function createManualChunksSorter(): GetManualChunk {
  // TODO: make this more configurable, and make it so that we bundle more intelligently
  // for split entries
  const packagesPath = path.resolve('packages') + path.sep;
  const globalPath = path.resolve('global') + path.sep;
  const sharedPath = path.resolve('shared') + path.sep;

  return (id, {getModuleInfo}) => {
    if (INTERNALS_TEST_STRINGS.some((test) => id.includes(test))) {
      return INTERNALS_CHUNK_NAME;
    }

    if (
      FRAMEWORK_TEST_STRINGS.some((test) =>
        typeof test === 'string' ? id.includes(test) : test.test(id),
      )
    ) {
      return FRAMEWORK_CHUNK_NAME;
    }

    if (POLYFILL_TEST_STRINGS.some((test) => id.includes(test))) {
      return POLYFILLS_CHUNK_NAME;
    }

    let bundleBaseName: string | undefined;
    let relativeId: string | undefined;

    if (id.includes('/node_modules/')) {
      const moduleInfo = getModuleInfo(id);

      // If the only dependency is another vendor, let Rollup handle the naming
      if (moduleInfo == null) return;
      if (
        moduleInfo.importers.length > 0 &&
        moduleInfo.importers.every((importer) =>
          importer.includes('/node_modules/'),
        )
      ) {
        return;
      }

      bundleBaseName = VENDOR_CHUNK_NAME;
      relativeId = id.replace(/^.*[/]node_modules[/]/, '');
    } else if (id.startsWith(packagesPath)) {
      bundleBaseName = PACKAGES_CHUNK_NAME;
      relativeId = id.replace(packagesPath, '');
    } else if (id.startsWith(globalPath)) {
      bundleBaseName = GLOBAL_CHUNK_NAME;
      relativeId = id.replace(globalPath, '');
    } else if (id.startsWith(sharedPath)) {
      bundleBaseName = SHARED_CHUNK_NAME;
      relativeId = id.replace(sharedPath, '');
    }

    if (bundleBaseName == null || relativeId == null) {
      return;
    }

    return `${bundleBaseName}-${relativeId.split(path.sep)[0]?.split('.')[0]}`;
  };
}

function getSourceFromCustomEntry(
  entry?: string | {source: string; inline?: boolean},
) {
  return typeof entry === 'object' ? entry.source : entry;
}
