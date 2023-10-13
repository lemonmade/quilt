import type {Plugin, PluginContext} from 'rollup';
import {stripIndent} from 'common-tags';

import {
  MAGIC_MODULE_APP_COMPONENT,
  MAGIC_MODULE_SERVER_ENTRY,
  MAGIC_MODULE_BROWSER_ENTRY,
  MAGIC_MODULE_BROWSER_ASSETS,
  MAGIC_MODULE_ENV,
} from '../../constants.ts';

import {type MagicModulesOptions} from './module.ts';

import {createEnvMagicModule} from './shared/env.ts';
import {resolveValueOrPromise, type ValueOrPromise} from './shared/values.ts';

export interface BrowserMagicModuleOptions {
  /**
   * Whether the app should use hydration or client-side rendering.
   */
  shouldHydrate?: ValueOrPromise<boolean | undefined>;

  /**
   * The CSS selector to render or hydrate the application into.
   */
  cssSelector?: ValueOrPromise<string | undefined>;

  /**
   * Allows you to perform any final alterations on the content used
   * as the magic browser entry.
   */
  customize?(content: string): string | Promise<string>;
}

export interface ServerMagicModuleOptions {
  /**
   * Allows you to perform any final alterations on the content used
   * as the magic server entry.
   */
  customize?(content: string): string | Promise<string>;
}

export interface AppMagicModulesOptions extends MagicModulesOptions {
  /**
   * Configuration for the magic app module, `quilt:magic/app`. You can
   * pass one of the following types:
   *
   * - A `string`, which should be a module specifier to import as the app
   * entrypoint for this application. This module should export a React component
   * as its default export.
   * - `false`, which disables the magic app module.
   *
   * @example './App.tsx'
   * @default false
   */
  app?: false | ValueOrPromise<string>;

  /**
   * Configuration for the magic browser module, `quilt:magic/browser`. You can
   * pass one of the following types:
   *
   * - A `string`, which should be a module specifier to import as the browser
   * entrypoint for this application.
   * - A `boolean`, which can be set to `true` to get the default browser module,
   * or `false` to disable the browser module.
   * - An object, which can be used to customize the default browser module.
   *
   * The default browser module imports the Quilt globals module, and then renders
   * the React application (imported from `quilt:magic/app`) into a root page element.
   *
   * @example './browser.tsx'
   * @default true
   */
  browser?: boolean | string | BrowserMagicModuleOptions;

  /**
   * Configuration for the magic server module, `quilt:magic/server`. You can
   * pass one of the following types:
   *
   * - A `string`, which should be a module specifier to import as the browser
   * entrypoint for this application.
   * - A `boolean`, which can be set to `true` to get the default browser module,
   * or `false` to disable the browser module.
   * - An object, which can be used to customize the default browser module.
   *
   * The default browser module imports the Quilt globals module, and then renders
   * the React application (imported from `quilt:magic/app`) into a root page element.
   *
   * @example './server.tsx'
   * @default true
   */
  server?: boolean | string | ServerMagicModuleOptions;
}

interface MagicModule {
  readonly sideEffects: boolean;
  source(this: PluginContext): Promise<string>;
}

const VIRTUAL_MODULE_PREFIX = '\0';
const VIRTUAL_MODULE_POSTFIX = '/module.js';

export function appMagicModules({
  mode = 'production',
  env = true,
  app = false,
  browser = true,
  server = true,
}: AppMagicModulesOptions) {
  const magicModules = new Map<string, MagicModule>();

  if (env !== false) {
    magicModules.set(MAGIC_MODULE_ENV, {
      sideEffects: false,
      async source() {
        const content = await createEnvMagicModule.call(this, {
          mode,
          ...(typeof env === 'boolean' ? {} : env),
        });

        return content;
      },
    });
  }

  if (app !== false) {
    magicModules.set(MAGIC_MODULE_APP_COMPONENT, {
      sideEffects: false,
      async source() {
        const appEntry = await resolveValueOrPromise(app);

        return stripIndent`
          import {default} from ${JSON.stringify(appEntry)};
        `;
      },
    });
  }

  if (browser !== false) {
    magicModules.set(MAGIC_MODULE_BROWSER_ENTRY, {
      sideEffects: true,
      async source() {
        if (typeof browser === 'string') {
          return `import ${JSON.stringify(browser)};`;
        }

        const {shouldHydrate, cssSelector, customize} =
          typeof browser === 'boolean'
            ? ({} as BrowserMagicModuleOptions)
            : browser;

        const [hydrate = true, selector = '#app'] = await Promise.all([
          resolveValueOrPromise(shouldHydrate),
          resolveValueOrPromise(cssSelector),
        ]);

        const reactRootFunction = hydrate ? 'hydrateRoot' : 'createRoot';

        const initialContent = stripIndent`
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

        const content = (await customize?.(initialContent)) ?? initialContent;
        return content;
      },
    });
  }

  if (server !== false) {
    magicModules.set(MAGIC_MODULE_SERVER_ENTRY, {
      sideEffects: false,
      async source() {
        if (typeof server === 'string') {
          return `export {default} from ${JSON.stringify(server)};`;
        }

        const {customize} =
          typeof server === 'boolean'
            ? ({} as ServerMagicModuleOptions)
            : server;

        const initialContent = stripIndent`
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

        const content = (await customize?.(initialContent)) ?? initialContent;
        return content;
      },
    });
  }

  return {
    name: '@quilted/app/magic-modules',
    resolveId(id) {
      const magicModule = magicModules.get(id);

      if (magicModule == null) return null;

      const virtualModuleID = `${VIRTUAL_MODULE_PREFIX}${id}${VIRTUAL_MODULE_POSTFIX}`;

      return {
        id: virtualModuleID,
        moduleSideEffects: magicModule.sideEffects ? 'no-treeshake' : undefined,
      };
    },
    async load(source) {
      if (
        !source.startsWith(VIRTUAL_MODULE_PREFIX) ||
        !source.endsWith(VIRTUAL_MODULE_POSTFIX)
      ) {
        return null;
      }

      const magicModule = magicModules.get(
        source.slice(
          VIRTUAL_MODULE_PREFIX.length,
          source.length - VIRTUAL_MODULE_POSTFIX.length,
        ),
      );

      if (magicModule == null) return null;

      const code = await magicModule.source.call(this);

      return {
        code,
        moduleSideEffects: magicModule.sideEffects ? 'no-treeshake' : undefined,
      };
    },
  } satisfies Plugin;
}
