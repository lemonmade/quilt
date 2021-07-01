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
                return id;
              }

              return null;
            },
            load(source) {
              if (source === MAGIC_MODULE_APP_COMPONENT) {
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
