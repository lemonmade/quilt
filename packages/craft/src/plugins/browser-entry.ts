import {stripIndent} from 'common-tags';

import {createProjectPlugin, Runtime} from '@quilted/sewing-kit';
import type {App, WaterfallHook} from '@quilted/sewing-kit';

import {MAGIC_MODULE_APP_COMPONENT} from '../constants';

const MAGIC_ENTRY_MODULE = '__quilt__/AppBrowserEntry.tsx';

export interface BrowserEntryHooks {
  quiltBrowserEntryShouldHydrate: WaterfallHook<boolean>;
  quiltBrowserEntryContent: WaterfallHook<string | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends BrowserEntryHooks {}
}

export function browserEntry() {
  return createProjectPlugin<App>({
    name: 'Quilt.App.BrowserEntry',
    build({hooks, configure}) {
      hooks<BrowserEntryHooks>(({waterfall}) => ({
        quiltBrowserEntryContent: waterfall(),
        quiltBrowserEntryShouldHydrate: waterfall(),
      }));

      configure(
        (
          {
            rollupInput,
            rollupInputOptions,
            rollupPlugins,
            quiltBrowserEntryContent,
            quiltBrowserEntryShouldHydrate,
          },
          {target},
        ) => {
          if (!target.includes(Runtime.Browser)) return;

          rollupInput?.(() => [MAGIC_ENTRY_MODULE]);

          rollupInputOptions?.((options) => {
            options.preserveEntrySignatures = false;
            return options;
          });

          rollupPlugins?.(async (plugins) => {
            plugins.push({
              name: '@quilted/web-app/magic-entry',
              resolveId(id) {
                if (id !== MAGIC_ENTRY_MODULE) return null;
                return id;
              },
              async load(source) {
                if (source !== MAGIC_ENTRY_MODULE) return null;

                const content = await quiltBrowserEntryContent!.run(undefined);

                if (content) return content;

                const shouldHydrate = await quiltBrowserEntryShouldHydrate!.run(
                  true,
                );

                const reactFunction = shouldHydrate ? 'hydrate' : 'render';

                stripIndent`
                  import {${reactFunction}} from 'react-dom';
                  import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
    
                  ${reactFunction}(<App />, document.getElementById('app'));
                `;
              },
            });

            return plugins;
          });
        },
      );
    },
  });
}
