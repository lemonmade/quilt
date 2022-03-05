import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {MAGIC_MODULE_APP_COMPONENT} from '../constants';

export function magicModuleApp() {
  return createProjectPlugin<App>({
    name: 'Quilt.MagicModule.App',
    build({project, configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          plugins.push({
            name: '@quilted/magic-module/app',
            async resolveId(id) {
              if (id === MAGIC_MODULE_APP_COMPONENT) {
                // We resolve to a path within the project’s directory
                // so that it can use the app’s node_modules.
                return project.fs.resolvePath(id);
              }

              return null;
            },
            load(source) {
              if (
                source === project.fs.resolvePath(MAGIC_MODULE_APP_COMPONENT)
              ) {
                return `export {default} from ${JSON.stringify(
                  project.fs.resolvePath(project.entry ?? ''),
                )}`;
              }
            },
          });

          return plugins;
        });
      });
    },
  });
}
