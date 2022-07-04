import type {Plugin} from 'rollup';

import {createProjectPlugin} from '../kit';

import {MAGIC_MODULE_APP_COMPONENT} from '../constants';

export function magicModuleApp() {
  return createProjectPlugin({
    name: 'Quilt.MagicModule.App',
    build({configure}) {
      configure(({rollupPlugins, quiltAppEntry}) => {
        rollupPlugins?.((plugins) => {
          return [rollupPlugin(() => quiltAppEntry!.run()), ...plugins];
        });
      });
    },
    develop({configure}) {
      configure(({rollupPlugins, vitePlugins, quiltAppEntry}) => {
        rollupPlugins?.((plugins) => {
          return [rollupPlugin(() => quiltAppEntry!.run()), ...plugins];
        });

        vitePlugins?.((plugins) => {
          return [
            {...rollupPlugin(() => quiltAppEntry!.run()), enforce: 'pre'},
            ...plugins,
          ];
        });
      });
    },
  });
}

function rollupPlugin(getEntry: () => Promise<string>): Plugin {
  return {
    name: '@quilted/magic-module/app',
    async resolveId(id) {
      if (id === MAGIC_MODULE_APP_COMPONENT) return id;

      return null;
    },
    async load(source) {
      if (source === MAGIC_MODULE_APP_COMPONENT) {
        const entry = await getEntry();
        return `export {default} from ${JSON.stringify(entry)}`;
      }
    },
  };
}
