import type {Plugin} from 'rollup';

import {
  MAGIC_MODULE_ENTRY,
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_REQUEST_ROUTER,
} from './constants.ts';
import type {MagicModuleEnvOptions} from './env.ts';

import {multiline} from './shared/strings.ts';
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
  entry?: string;

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

export function quiltApp({env, entry}: AppOptions = {}) {
  return {
    name: '@quilted/app',
    async options(originalOptions) {
      const newPlugins = [
        ...(Array.isArray(originalOptions.plugins)
          ? originalOptions.plugins
          : originalOptions.plugins
          ? [originalOptions.plugins]
          : []),
      ];

      const newOptions = {...originalOptions, plugins: newPlugins};

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

      if (entry) {
        newPlugins.push(magicModuleAppComponent({entry}));
      }

      return newOptions;
    },
  } satisfies Plugin;
}

export interface AppBrowserOptions {
  /**
   * Whether the app should use hydration or client-side rendering.
   */
  hydrate?: boolean;

  /**
   * The CSS selector to render or hydrate the application into.
   */
  selector?: string;
}

export function quiltAppBrowser(options: AppBrowserOptions = {}) {
  return {
    name: '@quilted/app/browser',
    options(originalOptions) {
      const newPlugins = [
        ...(Array.isArray(originalOptions.plugins)
          ? originalOptions.plugins
          : originalOptions.plugins
          ? [originalOptions.plugins]
          : []),
      ];

      const newOptions = {...originalOptions, plugins: newPlugins};

      newPlugins.push(magicModuleAppBrowserEntry(options));

      return newOptions;
    },
  } satisfies Plugin;
}

export interface AppServerOptions {
  /**
   * The entry module for the server of this app. This module must export a
   * `RequestRouter` object as its default export, which will be wrapped in
   * the specific server runtime you configure.
   */
  entry?: string;
}

export function quiltAppServer(options: AppServerOptions = {}) {
  return {
    name: '@quilted/app/server',
    async options(originalOptions) {
      const newPlugins = [
        ...(Array.isArray(originalOptions.plugins)
          ? originalOptions.plugins
          : originalOptions.plugins
          ? [originalOptions.plugins]
          : []),
      ];

      const [{magicModuleRequestRouterEntry}] = await Promise.all([
        import('./request-router.ts'),
      ]);

      const newOptions = {...originalOptions, plugins: newPlugins};

      newPlugins.push(magicModuleRequestRouterEntry());
      newPlugins.push(magicModuleAppRequestRouter(options));

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
}: AppBrowserOptions = {}) {
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
