import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import type {Project} from '../../kit';
import {MAGIC_MODULE_APP_COMPONENT} from '../../constants';

export interface Options {
  /**
   * The relative path to the module you want to use as the
   * entry for your browser bundles. When provided, this completely
   * overwrites the default browser content.
   *
   * @example './browser.tsx'
   */
  entry?: string;

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

export function magicBrowserEntry({
  module: magicEntryModule,
  project,
  customizeContent,
  shouldHydrate,
  cssSelector,
  entry,
}: Options): Plugin {
  return {
    name: '@quilted/app/magic-entry',
    async resolveId(id) {
      if (
        id === magicEntryModule ||
        // Some tools require you to use a `/` so that the identifier is a valid
        // JavaScript asset module reference
        id === `/${magicEntryModule}`
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
      if (source !== project.fs.resolvePath(magicEntryModule)) {
        return null;
      }

      if (entry) {
        return `import ${JSON.stringify(project.fs.resolvePath(entry))};`;
      }

      const [hydrate, selector] = await Promise.all([
        shouldHydrate(),
        cssSelector(),
      ]);

      const reactRootFunction = hydrate ? 'hydrateRoot' : 'createRoot';

      const initialContent = stripIndent`
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

      const content = await customizeContent(initialContent);

      return {
        code: content,
        moduleSideEffects: 'no-treeshake',
      };
    },
  };
}
