import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import type {App} from '../../kit';
import {MAGIC_MODULE_APP_COMPONENT} from '../../constants';

export interface Options {
  /**
   * The path to a module in your project that will be run before anything
   * else in your browser entrypoint, including the code that initializes
   * the tiny Quilt runtime. This path can be absolute, or relative from
   * the root directory of the application.
   *
   * @example './browser/bootstrap'
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
   * @example './browser/entry'
   */
  entryModule?: string;

  /**
   * The project being built.
   */
  project: App;

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

const MAGIC_MODULE_CUSTOM_INITIALIZE = '__quilt__/BrowserCustomInitialize';
const MAGIC_MODULE_CUSTOM_ENTRY = '__quilt__/BrowserCustomEntry';

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
        id === MAGIC_MODULE_CUSTOM_ENTRY ||
        id === MAGIC_MODULE_CUSTOM_INITIALIZE
      ) {
        // We resolve to a path within the project’s directory
        // so that it can use the app’s node_modules.
        return {
          id: project.fs.resolvePath(id),
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

        const reactFunction = hydrate ? 'hydrate' : 'render';

        initialContent = stripIndent`
          ${
            initializeModule
              ? `import ${JSON.stringify(MAGIC_MODULE_CUSTOM_INITIALIZE)}`
              : ''
          }
          import '@quilted/quilt/global';
          import {${reactFunction}} from 'react-dom';
          import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};

          ${reactFunction}(<App />, document.querySelector(${JSON.stringify(
          selector,
        )}));
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
