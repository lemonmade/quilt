import * as path from 'path';
import * as fs from 'fs/promises';
import {glob} from 'glob';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

import type {Plugin, RollupOptions, GetManualChunk} from 'rollup';
import type {AssetsBuildManifest} from '@quilted/assets';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from './constants.ts';
import type {MagicModuleEnvOptions} from './features/env.ts';

import {multiline} from './shared/strings.ts';
import {
  getNodePlugins,
  removeBuildFiles,
  type RollupNodePluginOptions,
} from './shared/rollup.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';
import {
  targetsSupportModules,
  getBrowserGroups,
  getBrowserGroupTargetDetails,
  getBrowserGroupRegularExpressions,
  type BrowserGroupTargetSelection,
} from './shared/browserslist.ts';
import {loadPackageJSON, type PackageJSON} from './shared/package-json.ts';
import {resolveRoot} from './shared/path.ts';

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
  env?: MagicModuleEnvOptions;
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

  baseURL?: string;
  targets?: BrowserGroupTargetSelection;
  priority?: number;

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

export interface AppServerOptions
  extends AppBaseOptions,
    Pick<RollupNodePluginOptions, 'bundle'> {
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
   * Whether to minify the JavaScript outputs for your server.
   *
   * @default false
   */
  minify?: boolean;

  /**
   * Customizes the assets created for your application.
   */
  assets?: Pick<AppBrowserAssetsOptions, 'baseURL' | 'inline'>;
}

const require = createRequire(import.meta.url);

export async function quiltApp({
  root: rootPath = process.cwd(),
  app,
  env,
  graphql,
  assets,
  browser: browserOptions,
  server: serverOptions,
}: AppOptions = {}) {
  const root = resolveRoot(rootPath);

  const browserGroups = await getBrowserGroups({root});
  const browserGroupEntries = Object.entries(browserGroups);
  const hasMultipleBrowserGroups = browserGroupEntries.length > 1;

  const optionPromises: Promise<RollupOptions>[] = [];

  browserGroupEntries.forEach(([name, browsers], index) => {
    optionPromises.push(
      quiltAppBrowser({
        root,
        app,
        graphql,
        ...browserOptions,
        env: {...env, ...browserOptions?.env},
        assets: {
          ...assets,
          ...browserOptions?.assets,
          priority: index,
          targets: hasMultipleBrowserGroups ? {name, browsers} : browsers,
        },
      }),
    );
  });

  optionPromises.push(
    quiltAppServer({
      root,
      app,
      graphql,
      ...serverOptions,
      env: {...env, ...serverOptions?.env},
      assets: {...assets, ...serverOptions?.assets},
    }),
  );

  return Promise.all(optionPromises);
}

export async function quiltAppBrowser({
  root: rootPath = process.cwd(),
  app,
  entry,
  env,
  assets,
  module,
  graphql = true,
}: AppBrowserOptions = {}) {
  const root =
    typeof rootPath === 'string' ? rootPath : fileURLToPath(rootPath);
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const minify = assets?.minify ?? mode === 'production';
  const baseURL = assets?.baseURL ?? '/assets/';
  const assetsInline = assets?.inline ?? true;

  const browserGroup = await getBrowserGroupTargetDetails(assets?.targets, {
    root,
  });
  const targetFilenamePart = browserGroup.name ? `.${browserGroup.name}` : '';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {createTSConfigAliasPlugin},
    {css},
    {assetManifest, rawAssets, staticAssets},
    {asyncModules},
    {systemJS},
    {workers},
    {esnext},
    nodePlugins,
    packageJSON,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/async.ts'),
    import('./features/system-js.ts'),
    import('./features/workers.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({bundle: true}),
    loadPackageJSON(root),
  ]);

  const plugins: Plugin[] = [
    ...nodePlugins,
    systemJS({minify}),
    replaceProcessEnv({mode}),
    magicModuleEnv({...env, mode}),
    sourceCode({
      mode,
      targets: browserGroup.browsers,
      babel: {
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
    esnext({
      mode,
      targets: browserGroup.browsers,
    }),
    css({minify, emit: true}),
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
      moduleID: ({imported}) => path.relative(root, imported),
    }),
    workers({
      baseURL,
      outputOptions: {
        format: 'iife',
        inlineDynamicImports: true,
        dir: path.resolve(root, `build/assets`),
        entryFileNames: `[name]${targetFilenamePart}.[hash].js`,
        assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
        chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
      },
    }),
    // removeBuildFiles(['build/assets', 'build/manifests', 'build/reports'], {
    //   root,
    // }),
  ];

  const tsconfigAliases = await createTSConfigAliasPlugin();

  if (tsconfigAliases) {
    plugins.push(tsconfigAliases);
  }

  const appEntry = await resolveAppEntry(app, {root, packageJSON});

  if (appEntry) {
    plugins.push(magicModuleAppComponent({entry: appEntry}));
  }

  plugins.push(magicModuleAppBrowserEntry(module));

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');

    plugins.push(
      graphql({
        manifest: path.resolve(`manifests/graphql${targetFilenamePart}.json`),
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
      file: path.resolve(`build/manifests/assets${targetFilenamePart}.json`),
      priority: assets?.priority,
    }),
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: path.resolve(
        `build/reports/bundle-visualizer${targetFilenamePart}.html`,
      ),
    }),
  );

  const finalEntry = entry
    ? path.resolve(root, entry)
    : (await glob('{browser,client,web}.{ts,tsx,mjs,js,jsx}', {
        cwd: root,
        nodir: true,
        absolute: true,
      }).then((files) => files[0])) ?? MAGIC_MODULE_ENTRY;

  const isESM = await targetsSupportModules(browserGroup.browsers);

  return {
    input: finalEntry,
    plugins,
    onwarn(warning, defaultWarn) {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        /['"]use client['"]/.test(warning.message)
      ) {
        return;
      }

      defaultWarn(warning);
    },
    output: {
      format: isESM ? 'esm' : 'systemjs',
      dir: path.resolve(root, `build/assets`),
      entryFileNames: `app${targetFilenamePart}.[hash].js`,
      assetFileNames: `[name]${targetFilenamePart}.[hash].[ext]`,
      chunkFileNames: `[name]${targetFilenamePart}.[hash].js`,
      manualChunks: createManualChunksSorter(),
    },
  } satisfies RollupOptions;
}

export async function quiltAppServer({
  app,
  env,
  entry,
  format = 'request-router',
  graphql = true,
  minify = false,
  bundle,
  assets,
}: AppServerOptions = {}) {
  const root = process.cwd();
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const baseURL = assets?.baseURL ?? '/assets/';
  const assetsInline = assets?.inline ?? true;

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {createTSConfigAliasPlugin},
    {css},
    {rawAssets, staticAssets},
    {asyncModules},
    {esnext},
    nodePlugins,
    packageJSON,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/async.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({bundle}),
    loadPackageJSON(root),
  ]);

  const plugins: Plugin[] = [
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({...env, mode}),
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
      moduleID: ({imported}) => path.relative(root, imported),
    }),
    removeBuildFiles(['build/server'], {root}),
  ];

  const tsconfigAliases = await createTSConfigAliasPlugin();

  if (tsconfigAliases) {
    plugins.push(tsconfigAliases);
  }

  const appEntry = await resolveAppEntry(app, {root, packageJSON});

  if (appEntry) {
    plugins.push(magicModuleAppComponent({entry: appEntry}));
  }

  const serverEntry = entry
    ? path.resolve(root, entry)
    : await glob('{server,service,backend}.{ts,tsx,mjs,js,jsx}', {
        cwd: root,
        nodir: true,
        absolute: true,
      }).then((files) => files[0]);

  const finalEntry =
    format === 'request-router'
      ? MAGIC_MODULE_ENTRY
      : serverEntry ?? MAGIC_MODULE_ENTRY;

  plugins.push(
    magicModuleAppServerEntry({
      assets: {baseURL},
    }),
    magicModuleAppRequestRouter({entry: serverEntry}),
    magicModuleAppAssetManifests(),
  );

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
      filename: path.resolve(`build/reports/bundle-visualizer.server.html`),
    }),
  );

  return {
    input: finalEntry,
    plugins,
    onwarn(warning, defaultWarn) {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        /['"]use client['"]/.test(warning.message)
      ) {
        return;
      }

      defaultWarn(warning);
    },
    output: {
      // format: isESM ? 'esm' : 'systemjs',
      format: 'esm',
      dir: path.resolve(`build/server`),
      entryFileNames: 'server.js',
    },
  } satisfies RollupOptions;
}

export function magicModuleAppComponent({entry}: {entry: string}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app',
    module: MAGIC_MODULE_APP_COMPONENT,
    alias: entry,
  });
}

export function magicModuleAppRequestRouter({
  entry,
}: Pick<AppServerOptions, 'entry'> = {}) {
  return createMagicModulePlugin({
    name: '@quilted/magic-module/app-request-router',
    module: MAGIC_MODULE_REQUEST_ROUTER,
    alias: entry,
    source: entry
      ? undefined
      : async function source() {
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

export function magicModuleAppServerEntry({
  host,
  port,
  assets,
  format = 'module',
}: {
  host?: string;
  port?: number;
  assets?: boolean | {baseURL: string};
  format?: 'module' | 'commonjs';
} = {}) {
  const baseURL = typeof assets === 'object' ? assets.baseURL : '/assets/';

  return createMagicModulePlugin({
    name: '@quilted/request-router/app-server',
    module: MAGIC_MODULE_ENTRY,
    sideEffects: true,
    async source() {
      const serveAssets = Boolean(assets);

      return multiline`
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
        const host = ${host ? JSON.stringify(host) : 'process.env.HOST'};

        ${
          serveAssets
            ? `const dirname = ${
                format === 'module'
                  ? 'path.dirname(fileURLToPath(import.meta.url))'
                  : '__dirname'
              };\nconst serve = serveStatic(path.resolve(dirname, '../assets'), {
                baseUrl: ${JSON.stringify(baseURL)},
              });`
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
  '/node_modules/@quilted/polyfills/',
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

async function resolveAppEntry(
  entry: string | undefined,
  {root, packageJSON}: {root: string; packageJSON: PackageJSON},
) {
  if (entry) {
    return path.resolve(root, entry);
  }

  if (typeof packageJSON.main === 'string') {
    return path.resolve(root, packageJSON.main);
  }

  const rootEntry = (packageJSON.exports as any)?.['.'];

  if (typeof rootEntry === 'string') {
    return path.resolve(root, rootEntry);
  }

  const globbed = await glob('{App,app,index}.{ts,tsx,mjs,js,jsx}', {
    cwd: root,
    nodir: true,
    absolute: true,
  });

  return globbed[0];
}
