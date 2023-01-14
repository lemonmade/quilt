import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import type {Project} from '../../kit';
import {MAGIC_MODULE_APP_COMPONENT} from '../../constants';

export interface Options {
  /**
   * The path to a module in your project that will be run before anything
   * else in your browser entrypoint, including the code that initializes
   * the tiny Quilt runtime. This path can be absolute, or relative from
   * the root directory of the application.
   *
   * @example './browser/bootstrap.ts'
   */
  initializeModule?: string;

  /**
   * The path to a module in your project that will be run after the
   * `initializeModule` (if provided), and after the Quilt runtime is
   * installed. If you provide this option, it replaces the default content
   * that Quilt uses. The default content either renders or hydrates your
   * application with React, so if you provide this option, you **must**
   * do this rendering yourself.
   *
   * @example './browser/entry.tsx'
   */
  entryModule?: string;

  /**
   * The project being built.
   */
  project: Project;

  /**
   * The identifier to handle as the magic browser entry module.
   */
  module: string;

  /**
   * Whether the app should use hydration or client-side rendering.
   */
  shouldHydrate(): Promise<boolean>;

  /**
   * The CSS selector to render or hydrate the application into.
   */
  cssSelector(): Promise<string>;

  /**
   * Allows you to perform any final alterations on the content used
   * as the magic browser entry.
   */
  customizeContent(content: string): Promise<string>;
}

const MAGIC_MODULE_CUSTOM_INITIALIZE = '.quilt/magic/initialize.js';
const MAGIC_MODULE_CUSTOM_ENTRY = '.quilt/magic/browser-entry.js';

export function magicBrowserEntry({
  module: magicEntryModule,
  project,
  customizeContent,
  shouldHydrate,
  cssSelector,
  initializeModule,
  entryModule,
}: Options): Plugin {
  return {
    name: '@quilted/app/magic-entry',
    async resolveId(id) {
      if (
        id === magicEntryModule ||
        // Some tools require you to use a `/` so that the identifier is a valid
        // JavaScript asset module reference
        id === `/${magicEntryModule}` ||
        id === MAGIC_MODULE_CUSTOM_ENTRY ||
        id === MAGIC_MODULE_CUSTOM_INITIALIZE
      ) {
        // We resolve to a path within the project’s directory
        // so that it can use the app’s node_modules.
        return {
          id: project.fs.resolvePath(id.startsWith('/') ? id.slice(1) : id),
          moduleSideEffects: 'no-treeshake',
        };
      }

      return null;
    },
    async load(source) {
      if (source === project.fs.resolvePath(MAGIC_MODULE_CUSTOM_INITIALIZE)) {
        if (initializeModule == null) {
          throw new Error(
            'Can’t load initialize module because browser.initializeModule was not provided',
          );
        }

        return `import ${JSON.stringify(
          project.fs.resolvePath(initializeModule),
        )}`;
      }

      if (source === project.fs.resolvePath(MAGIC_MODULE_CUSTOM_ENTRY)) {
        if (entryModule == null) {
          throw new Error(
            'Can’t load entry module because browser.entryModule was not provided',
          );
        }

        return `import ${JSON.stringify(project.fs.resolvePath(entryModule))}`;
      }

      if (source !== project.fs.resolvePath(magicEntryModule)) {
        return null;
      }

      let initialContent: string;

      if (entryModule) {
        initialContent = stripIndent`
          ${
            initializeModule
              ? `import ${JSON.stringify(MAGIC_MODULE_CUSTOM_INITIALIZE)}`
              : ''
          }
          import '@quilted/quilt/global';
          import ${JSON.stringify(MAGIC_MODULE_CUSTOM_ENTRY)}
        `;
      } else {
        const [hydrate, selector] = await Promise.all([
          shouldHydrate(),
          cssSelector(),
        ]);

        const reactRootFunction = hydrate ? 'hydrateRoot' : 'createRoot';

        initialContent = stripIndent`
          ${
            initializeModule
              ? `import ${JSON.stringify(MAGIC_MODULE_CUSTOM_INITIALIZE)}`
              : ''
          }
          import '@quilted/quilt/global';
          import {jsx} from 'react/jsx-dev-runtime';
          import {${reactRootFunction}} from 'react-dom/client';
          import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};

          const element = document.querySelector(${JSON.stringify(selector)});

          ${
            hydrate
              ? `${reactRootFunction}(element, jsx(App));`
              : `${reactRootFunction}(element).render(jsx(App));`
          }
        `;
      }

      const content = await customizeContent(initialContent);

      return {
        code: content,
        moduleSideEffects: 'no-treeshake',
      };
    },
  };
}
