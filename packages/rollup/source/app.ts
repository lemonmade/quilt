import * as path from 'path';

import type {Plugin} from 'rollup';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from './constants.ts';
import type {MagicModuleEnvOptions} from './env.ts';

import {multiline} from './shared/strings.ts';
import {getNodePlugins, rollupPluginsToArray} from './shared/rollup.ts';
import {createMagicModulePlugin} from './shared/magic-module.ts';

export interface AppOptions {
  /**
   * The entry module for this app. This should be an absolute path, or relative
   * path from the root directory containing your project. This entry should just be
   * for the main `App` component in your project, which Quilt will automatically use
   * to create browser and server-side entries for your project.
   *
   * If you only want to use a custom entry module for the browser build, use the
   * `browser.entry` option instead. If you only want to use a custom entry module
   * for the server-side build, use the `server.entry` option instead.
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
   * Customizes the magic `quilt:module/browser` entry module.
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

export function quiltAppBrowser({
  app,
  env,
  assets,
  module,
  graphql = true,
}: AppBrowserOptions = {}) {
  return {
    name: '@quilted/app/browser',
    async options(originalOptions) {
      const newPlugins = rollupPluginsToArray(originalOptions.plugins);
      const newOptions = {...originalOptions, plugins: newPlugins};

      const [{visualizer}, nodePlugins] = await Promise.all([
        import('rollup-plugin-visualizer'),
        getNodePlugins(),
      ]);

      newPlugins.push(...nodePlugins);

      if (env) {
        const {magicModuleEnv, replaceProcessEnv} = await import('./env.ts');

        if (typeof env === 'boolean') {
          newPlugins.push(replaceProcessEnv({mode: 'production'}));
          newPlugins.push(magicModuleEnv({mode: 'production'}));
        } else {
          newPlugins.push(replaceProcessEnv({mode: env.mode ?? 'production'}));
          newPlugins.push(magicModuleEnv({mode: 'production', ...env}));
        }
      }

      if (app) {
        newPlugins.push(magicModuleAppComponent({entry: app}));
      }

      newPlugins.push(magicModuleAppBrowserEntry(module));

      if (graphql) {
        const {graphql} = await import('./graphql.ts');
        newPlugins.push(
          graphql({manifest: path.resolve(`manifests/graphql.json`)}),
        );
      }

      const minify = assets?.minify ?? true;

      if (minify) {
        const {minify} = await import('rollup-plugin-esbuild');
        newPlugins.push(minify());
      }

      newPlugins.push(
        visualizer({
          template: 'treemap',
          open: false,
          brotliSize: true,
          filename: path.resolve(`reports/bundle-visualizer.html`),
        }),
      );

      return newOptions;
    },
  } satisfies Plugin;
}

export interface AppServerOptions extends AppOptions {
  /**
   * The entry module for the server of this app. This module must export a
   * `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure.
   */
  entry?: string;
}

export function quiltAppServer({
  app,
  env,
  graphql,
  entry,
}: AppServerOptions = {}) {
  return {
    name: '@quilted/app/server',
    async options(originalOptions) {
      const newPlugins = rollupPluginsToArray(originalOptions.plugins);
      const newOptions = {...originalOptions, plugins: newPlugins};

      const [{magicModuleRequestRouterEntry}, nodePlugins] = await Promise.all([
        import('./request-router.ts'),
        getNodePlugins(),
      ]);

      newPlugins.push(...nodePlugins);

      if (env) {
        const {magicModuleEnv, replaceProcessEnv} = await import('./env.ts');

        if (typeof env === 'boolean') {
          newPlugins.push(replaceProcessEnv({mode: 'production'}));
          newPlugins.push(magicModuleEnv({mode: 'production'}));
        } else {
          newPlugins.push(replaceProcessEnv({mode: env.mode ?? 'production'}));
          newPlugins.push(magicModuleEnv({mode: 'production', ...env}));
        }
      }

      if (app) {
        newPlugins.push(magicModuleAppComponent({entry: app}));
      }

      newPlugins.push(magicModuleRequestRouterEntry());
      newPlugins.push(magicModuleAppRequestRouter({entry}));

      if (graphql) {
        const {graphql} = await import('./graphql.ts');
        newPlugins.push(graphql({manifest: false}));
      }

      return newOptions;
    },
  } satisfies Plugin;
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
