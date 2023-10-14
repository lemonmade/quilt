import * as path from 'path';

import type {Plugin, RollupOptions, GetManualChunk} from 'rollup';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from './constants.ts';
import type {MagicModuleEnvOptions} from './features/env.ts';

import {multiline} from './shared/strings.ts';
import {getNodePlugins} from './shared/rollup.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';

export interface AppOptions {
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
   * browser entrypoint.
   *
   * @example './browser.tsx'
   * @default 'quilt:module/entry'
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
}

export async function quiltAppBrowser({
  app,
  entry = MAGIC_MODULE_ENTRY,
  env,
  assets,
  module,
  graphql = true,
}: AppBrowserOptions = {}) {
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const minify = assets?.minify ?? mode === 'production';

  const [
    {visualizer},
    {sourceCode},
    {css},
    {rawAssets, staticAssets},
    {systemJS},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/source-code.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/system-js.ts'),
    getNodePlugins(),
  ]);

  const plugins: Plugin[] = [
    ...nodePlugins,
    systemJS(),
    sourceCode({mode}),
    css({minify}),
    rawAssets(),
    staticAssets(),
  ];

  if (env) {
    const {magicModuleEnv, replaceProcessEnv} = await import(
      './features/env.ts'
    );

    if (typeof env === 'boolean') {
      plugins.push(replaceProcessEnv({mode}));
      plugins.push(magicModuleEnv({mode}));
    } else {
      plugins.push(replaceProcessEnv({mode}));
      plugins.push(magicModuleEnv({mode}));
    }
  }

  if (app) {
    plugins.push(magicModuleAppComponent({entry: app}));
  }

  plugins.push(magicModuleAppBrowserEntry(module));

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: path.resolve(`manifests/graphql.json`)}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: path.resolve(`reports/bundle-visualizer.html`),
    }),
  );

  return {
    input: entry,
    plugins,
    output: {
      // format: isESM ? 'esm' : 'systemjs',
      format: 'esm',
      dir: path.resolve(`build/assets`),
      entryFileNames: `app.[hash].js`,
      assetFileNames: `[name].[hash].[ext]`,
      chunkFileNames: `[name].[hash].js`,
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
  graphql,
  entry = MAGIC_MODULE_ENTRY,
  minify = false,
}: AppServerOptions = {}) {
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';

  const [
    {visualizer},
    {sourceCode},
    {css},
    {rawAssets, staticAssets},
    {magicModuleRequestRouterEntry},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/source-code.ts'),
    import('./features/css.ts'),
    import('./features/assets.ts'),
    import('./features/request-router.ts'),
    getNodePlugins(),
  ]);

  const plugins: Plugin[] = [
    ...nodePlugins,
    sourceCode({mode}),
    css({emit: false}),
    rawAssets(),
    staticAssets({emit: false}),
  ];

  if (env) {
    const {magicModuleEnv, replaceProcessEnv} = await import(
      './features/env.ts'
    );

    if (typeof env === 'boolean') {
      plugins.push(replaceProcessEnv({mode}));
      plugins.push(magicModuleEnv({mode}));
    } else {
      plugins.push(replaceProcessEnv({mode}));
      plugins.push(magicModuleEnv({mode}));
    }
  }

  if (app) {
    plugins.push(magicModuleAppComponent({entry: app}));
  }

  plugins.push(magicModuleRequestRouterEntry());
  plugins.push(magicModuleAppRequestRouter({entry}));

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
      brotliSize: true,
      filename: path.resolve(`reports/bundle-visualizer.html`),
    }),
  );

  return {
    input: entry,
    plugins,
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
