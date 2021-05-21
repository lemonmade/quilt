import {stripIndent} from 'common-tags';
import {
  WebApp,
  Target,
  createProjectPlugin,
  Task,
  addHooks,
  WaterfallHook,
} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  DevWebAppConfigurationHooks,
  BuildWebAppTargetOptions,
} from '@sewing-kit/hooks';

import type {} from './web-app-auto-server';
import {MAGIC_MODULE_APP_COMPONENT} from './constants';

interface CustomHooks {
  readonly quiltBrowserEntryContent: WaterfallHook<string>;
}

declare module '@sewing-kit/hooks' {
  interface BuildWebAppConfigurationCustomHooks extends CustomHooks {}
  interface DevWebAppConfigurationCustomHooks extends CustomHooks {}
}

interface IncludeDetails {
  readonly task: Task;
  readonly target?: Target<WebApp, BuildWebAppTargetOptions>;
}

interface BrowserEntryOptions {
  readonly hydrate?: boolean | ((details: IncludeDetails) => boolean);
  include?(details: IncludeDetails): boolean;
}

const MAGIC_ENTRY_MODULE = '__quilt__/magic-entry-web-app';

export function webAppBrowserEntry({
  hydrate = true,
  include = () => true,
}: BrowserEntryOptions = {}) {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppBrowserEntry',
    ({project, tasks}) => {
      function addConfiguration(task: Task, target?: IncludeDetails['target']) {
        return ({
          rollupInput,
          rollupPlugins,
          quiltBrowserEntryContent,
        }: BuildWebAppConfigurationHooks | DevWebAppConfigurationHooks) => {
          rollupInput?.hook(() => [MAGIC_ENTRY_MODULE]);

          const shouldHydrate =
            typeof hydrate === 'boolean' ? hydrate : hydrate({target, task});
          const reactFunction = shouldHydrate ? 'hydrate' : 'render';

          rollupInput?.hook(() => [MAGIC_ENTRY_MODULE]);
          rollupPlugins?.hook((plugins) => [
            ...plugins,
            {
              name: '@quilted/web-app/magic-entry',
              resolveId(id) {
                if (id !== MAGIC_ENTRY_MODULE) return null;
                return id;
              },
              async load(source) {
                if (source !== MAGIC_ENTRY_MODULE) return null;

                const content = await quiltBrowserEntryContent!.run(stripIndent`
                  import {${reactFunction}} from 'react-dom';
                  import App from ${JSON.stringify(MAGIC_MODULE_APP_COMPONENT)};
    
                  ${reactFunction}(<App />, document.getElementById('app'));
                `);

                if (content == null) {
                  throw new Error(
                    `No http handler content found for project ${project.name}`,
                  );
                }

                return content;
              },
            },
          ]);
        };
      }

      const addSourceHooks = addHooks<CustomHooks>(() => ({
        quiltBrowserEntryContent: new WaterfallHook(),
      }));

      tasks.build.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        hooks.target.hook(({target, hooks}) => {
          if (target.options.quiltAutoServer) return;
          if (!include({target, task: Task.Build})) return;

          hooks.configure.hook(addConfiguration(Task.Build, target));
        });
      });

      // eslint-disable-next-line no-warning-comments
      // TODO: dev needs targets too!
      tasks.dev.hook(({hooks}) => {
        hooks.configureHooks.hook(addSourceHooks);

        if (!include({task: Task.Dev})) return;

        hooks.configure.hook(addConfiguration(Task.Dev));
      });
    },
  );
}
