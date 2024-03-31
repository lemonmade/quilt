import * as path from 'path';
import * as fs from 'fs/promises';
import {createRequire} from 'module';

import type {
  Plugin,
  RollupOptions,
  InputPluginOption,
  GetManualChunk,
} from 'rollup';
import type {AssetsBuildManifest} from '@quilted/assets';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
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
  server?: Omit<AppServerOptions, keyof AppBaseOptions> &
    Pick<AppServerOptions, 'env'>;

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
   *
   *
   * @example './browser.tsx'
   */
  entry?: string;

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
   * Whether this server code uses the `request-router` library to
   * define itself in a generic way, which can be adapted to a variety
   * of environments. By default, this is `'request-router'`, and when `'request-router'`,
   * the `entry` you specified must export an `RequestRouter` object as
   * its default export. When set to `false`, the app server will be built
   * as a basic server-side JavaScript project, without the special
   * `request-router` adaptor.
   *
   * @default 'request-router'
   */
  format?: 'request-router' | 'custom';

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
}

export interface AppServerRuntime extends Omit<ServerRuntime, 'requestRouter'> {
  requestRouter?(options: {
    assets: Required<Pick<AppBrowserAssetsOptions, 'baseURL'>>;
  }): string;
}

export {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
};

const require = createRequire(import.meta.url);

export async function quiltApp({
  root = process.cwd(),
  app,
  env,
  graphql,
  assets,
  browser: browserOptions,
  server: serverOptions,
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

  optionPromises.push(
    quiltAppServer({
      root: project.root,
      app,
      graphql,
      runtime: runtime?.server,
      ...serverOptions,
      env: {
        ...resolveEnvOption(env),
        ...resolveEnvOption(serverOptions?.env),
      },
      assets: {...assets, ...serverOptions?.assets},
    }),
  );

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

  return {
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
      minifyInternalExports: true,
    },
  } satisfies RollupOptions;
}

export async function quiltAppBrowserPlugins({
  root = process.cwd(),
  app,
  entry,
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
    getNodePlugins({bundle: true}),
    targetsSupportModuleWebWorkers(browserGroup.browsers),
  ]);

  const plugins: InputPluginOption[] = [
    quiltAppBrowserInput({root: project.root, entry}),
    ...nodePlugins,
    systemJS({minify}),
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

  plugins.push(
    assetManifest({
      baseURL,
      cacheKey,
      file: path.join(manifestsDirectory, `assets${targetFilenamePart}.json`),
      priority: assets?.priority,
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
}: Pick<AppBrowserOptions, 'root' | 'entry'> = {}) {
  return {
    name: '@quilted/app-browser/input',
    async options(options) {
      const finalEntry =
        normalizeRollupInput(options.input) ??
        (await sourceEntryForAppBrowser({entry, root})) ??
        MAGIC_MODULE_ENTRY;
      const finalEntryName =
        typeof finalEntry === 'string' && finalEntry !== MAGIC_MODULE_ENTRY
          ? path.basename(finalEntry).split('.').slice(0, -1).join('.')
          : 'browser';

      return {
        ...options,
        // If we are using the "magic entry", give it an explicit name of `browser`.
        // Otherwise, Rollup will use the file name as the output name.
        input:
          typeof finalEntry === 'string'
            ? {[finalEntryName]: finalEntry}
            : finalEntry,
      };
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
  format = 'request-router',
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
      name: '@quilted/request-router',
      sideEffects: true,
      module: MAGIC_MODULE_ENTRY,
      source() {
        const options = {assets: {baseURL}};

        return (
          runtime.requestRouter?.(options) ??
          nodeAppServerRuntime().requestRouter(options)
        );
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
      filename: path.join(reportsDirectory, `bundle-visualizer.server.html`),
    }),
  );

  return plugins;
}

export function quiltAppServerInput({
  root = process.cwd(),
  entry,
  format = 'request-router',
}: Pick<AppServerOptions, 'root' | 'entry' | 'format'> = {}) {
  return {
    name: '@quilted/app-server/input',
    async options(options) {
      const serverEntry =
        normalizeRollupInput(options.input) ??
        (await sourceEntryForAppServer({entry, root}));
      const finalEntry =
        format === 'request-router'
          ? MAGIC_MODULE_ENTRY
          : serverEntry ?? MAGIC_MODULE_ENTRY;
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

export interface NodeAppServerRuntimeOptions extends NodeServerRuntimeOptions {
  /**
   * Whether the server should serve assets from the asset output directory.
   *
   * @default true
   */
  assets?: boolean;
}

export function nodeAppServerRuntime({
  host,
  port,
  format = 'module',
  assets: serveAssets = true,
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
    requestRouter({assets}) {
      const {baseURL} = assets;

      return multiline`
        ${serveAssets ? `import * as path from 'path';` : ''}
        ${rollupFormat === 'cjs' ? '' : `import {fileURLToPath} from 'url';`}
        import {createServer} from 'http';

        import requestRouter from ${JSON.stringify(
          MAGIC_MODULE_REQUEST_ROUTER,
        )};

        import {createHttpRequestListener${
          serveAssets ? ', serveStatic' : ''
        }} from '@quilted/quilt/request-router/node';

        const port = ${port ?? 'Number.parseInt(process.env.PORT, 10)'};
        const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};

        ${
          serveAssets
            ? multiline`
              const dirname = ${
                rollupFormat === 'cjs'
                  ? `__dirname`
                  : `path.dirname(fileURLToPath(import.meta.url))`
              };
              const serve = serveStatic(path.resolve(dirname, '../assets'), {
                baseUrl: ${JSON.stringify(baseURL)},
              });
            `
            : ''
        }
        const listener = createHttpRequestListener(requestRouter);
      
        createServer(async (request, response) => {
          ${
            serveAssets
              ? `if (request.url.startsWith(${JSON.stringify(
                  baseURL,
                )})) return serve(request, response);`
              : ''
          }

          await listener(request, response);
        }).listen(port, host);
      `;
    },
  } satisfies AppServerRuntime;
}

export function magicModuleAppComponent({
  entry,
  root = process.cwd(),
}: {
  entry?: string;
  root?: string;
}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app',
    module: MAGIC_MODULE_APP_COMPONENT,
    alias:
      entry ??
      async function magicModuleApp() {
        const project = Project.load(root);
        const {packageJSON} = project;

        if (typeof packageJSON.raw.main === 'string') {
          return project.resolve(packageJSON.raw.main);
        }

        const rootEntry = (packageJSON.raw.exports as any)?.['.'];

        if (typeof rootEntry === 'string') {
          return project.resolve(rootEntry);
        }

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
    name: '@quilted/magic-module/app-request-router',
    module: MAGIC_MODULE_REQUEST_ROUTER,
    alias:
      entry ??
      async function magicModuleRequestRouter() {
        const project = Project.load(root);

        const globbed = await project.glob(
          '{server,service,backend}.{ts,tsx,mjs,js,jsx}',
          {
            nodir: true,
            absolute: true,
          },
        );

        return globbed[0]!;
      },
    async source() {
      return multiline`
        import '@quilted/quilt/globals';

        import {jsx} from 'react/jsx-runtime';
        import {RequestRouter} from '@quilted/quilt/request-router';
        import {renderToResponse} from '@quilted/quilt/server';

        import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
        import {BrowserAssets} from ${JSON.stringify(
          MAGIC_MODULE_BROWSER_ASSETS,
        )};

        const router = new RequestRouter();
        const assets = new BrowserAssets();

        // For all GET requests, render our React application.
        router.get(async (request) => {
          const response = await renderToResponse(jsx(App), {
            request,
            assets,
          });

          return response;
        });

        export default router;
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
      const reactRootFunction = hydrate ? 'hydrateRoot' : 'createRoot';

      return multiline`
        import '@quilted/quilt/globals';

        import {jsx} from 'react/jsx-runtime';
        import {${reactRootFunction}} from 'react-dom/client';

        import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};

        const element = document.querySelector(${JSON.stringify(selector)});

        ${
          hydrate
            ? `${reactRootFunction}(element, jsx(App));`
            : `${reactRootFunction}(element).render(jsx(App));`
        }
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
            JSON.parse(await fs.readFile(file, 'utf8')) as AssetsBuildManifest,
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
  } else {
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
