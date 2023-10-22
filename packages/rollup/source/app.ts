import * as path from 'path';
import * as fs from 'fs/promises';
import {glob} from 'glob';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

import type {Plugin, RollupOptions, GetManualChunk} from 'rollup';
import type {AssetsBuildManifest} from '@quilted/assets';
import type {} from '@quilted/babel/async';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from './constants.ts';
import type {MagicModuleEnvOptions} from './features/env.ts';

import {multiline} from './shared/strings.ts';
import {getNodePlugins, removeBuildFiles} from './shared/rollup.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';
import {
  targetsSupportModules,
  getBrowserGroupTargetDetails,
  getBrowserGroupRegularExpressions,
  type BrowserGroupTargetSelection,
} from './shared/browserslist.ts';

export interface AppOptions {
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
   * can further customize the environment variables provided during server-side
   * rendering by passing `server.env`.
   */
  env?: MagicModuleEnvOptions;
}

export interface AppBrowserOptions extends AppOptions {
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
   * Whether to minify assets created by Quilt.
   *
   * @default true
   */
  minify?: boolean;

  baseURL?: string;
  targets?: BrowserGroupTargetSelection;
  priority?: number;
}

const require = createRequire(import.meta.url);

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

  const browserTarget = await getBrowserGroupTargetDetails(assets?.targets, {
    root,
  });
  const targetFilenamePart = browserTarget.name ? `.${browserTarget.name}` : '';

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
    nodePlugins,
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
    getNodePlugins(),
  ]);

  const plugins: Plugin[] = [
    ...nodePlugins,
    systemJS({minify}),
    replaceProcessEnv({mode}),
    magicModuleEnv({...env, mode}),
    sourceCode({
      mode,
      targets: browserTarget.browsers,
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
    css({minify, emit: true}),
    rawAssets(),
    staticAssets({baseURL, emit: true}),
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
    removeBuildFiles(['build/assets', 'build/manifests', 'build/reports'], {
      root,
    }),
  ];

  const tsconfigAliases = await createTSConfigAliasPlugin();

  if (tsconfigAliases) {
    plugins.push(tsconfigAliases);
  }

  const appEntry =
    app ??
    (await glob('{App,app,input}.{ts,tsx,mjs,js,jsx}', {
      cwd: root,
      nodir: true,
      absolute: true,
    }).then((files) => files[0]));

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

  const cacheKey = browserTarget.name
    ? {browserTarget: browserTarget.name}
    : undefined;
  const id = browserTarget.name ? browserTarget.name : undefined;

  plugins.push(
    assetManifest({
      id,
      cacheKey,
      baseURL,
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

  const finalEntry =
    entry ??
    (await glob('{browser,client}.{ts,tsx,mjs,js,jsx}', {
      cwd: root,
      nodir: true,
      absolute: true,
    }).then((files) => files[0])) ??
    MAGIC_MODULE_ENTRY;

  const isESM = await targetsSupportModules(browserTarget.browsers);

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

export interface AppServerOptions extends AppOptions {
  /**
   * The entry module for the server of this app. This module must export a
   * `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure.
   */
  entry?: string;

  /**
   * Whether to minify the JavaScript outputs for your server.
   *
   * @default false
   */
  minify?: boolean;
}

export async function quiltAppServer({
  app,
  env,
  entry,
  graphql = true,
  minify = false,
}: AppServerOptions = {}) {
  const root = process.cwd();
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {createTSConfigAliasPlugin},
    {css},
    {rawAssets, staticAssets},
    {magicModuleRequestRouterEntry},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/request-router.ts'),
    getNodePlugins(),
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
    css({emit: false, minify}),
    rawAssets(),
    staticAssets({emit: false}),
    removeBuildFiles(['build/server'], {root}),
  ];

  const tsconfigAliases = await createTSConfigAliasPlugin();

  if (tsconfigAliases) {
    plugins.push(tsconfigAliases);
  }

  const appEntry =
    app ??
    (await glob('{App,app,input}.{ts,tsx,mjs,js,jsx}', {
      cwd: root,
      nodir: true,
      absolute: true,
    }).then((files) => files[0]));

  if (appEntry) {
    plugins.push(magicModuleAppComponent({entry: appEntry}));
  }

  plugins.push(
    magicModuleRequestRouterEntry(),
    magicModuleAppRequestRouter({entry}),
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

  const finalEntry =
    entry ??
    (await glob('{server,service,backend}.{ts,tsx,mjs,js,jsx}', {
      cwd: root,
      nodir: true,
      absolute: true,
    }).then((files) => files[0])) ??
    MAGIC_MODULE_ENTRY;

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
