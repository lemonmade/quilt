import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import {MAGIC_MODULE_APP_COMPONENT} from '../constants';

import {getEntry} from './shared';

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
                return {
                  id: await getEntry(project),
                  moduleSideEffects: 'no-treeshake',
                };
              }

              return null;
            },
          });

          return plugins;
        });
      });
    },
  });
}
