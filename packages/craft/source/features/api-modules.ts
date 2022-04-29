import {stripIndent} from 'common-tags';

import type {MagicModuleRollupPlugin} from '../tools/rollup';
import type {} from '../tools/vite';

import {MAGIC_MODULE_APP_API} from '../constants';
import {createProjectPlugin} from '../kit';
import type {App} from '../kit';

export function apiModules() {
  return createProjectPlugin<App>({
    name: 'Quilt.App.ApiModules',
    develop({project, configure}) {
      configure(
        ({babelPlugins, rollupPlugins, vitePlugins}, {quiltAppServer}) => {
          babelPlugins?.((plugins) => [
            ...plugins,
            require.resolve('@quilted/api-modules/babel'),
          ]);

          rollupPlugins?.((plugins) => {
            const newPlugins = [...plugins];

            if (quiltAppServer) {
              newPlugins.unshift(magicModuleRollupPlugin());
            }

            return newPlugins;
          });

          vitePlugins?.((plugins) => {
            const newPlugins = [...plugins];

            if (quiltAppServer) {
              newPlugins.unshift({
                enforce: 'pre',
                ...magicModuleRollupPlugin(),
              });
            }

            return newPlugins;
          });
        },
      );
    },
  });
}

function magicModuleRollupPlugin(): MagicModuleRollupPlugin {
  return {
    name: '@quilted/magic-module-app-api',
    async resolveId(id) {
      if (id === MAGIC_MODULE_APP_API) return id;
      return null;
    },
    load(id) {
      if (id !== MAGIC_MODULE_APP_API) return null;

      return stripIndent`
        import {createHttpHandler, json} from '@quilted/quilt/http-handlers';

        const API_CACHE = new Map();

        const Api = {
          register(path, load) {
            API_CACHE.set(path, load);
          },
        };
        
        Reflect.defineProperty(globalThis.Quilt, 'Api', {
          value: Api,
          enumerable: true,
        })

        export default function createApiHandler() {
          const handler = createHttpHandler();

          handler.any('.api', async (request) => {
            console.log(request.url.href);

            const path = request.url.pathname.slice('/.api'.length);
            if (!API_CACHE.has(path)) return;

            const module = await API_CACHE.get(path)();
            const name = request.url.searchParams.get('name');
            const args = JSON.parse(request.url.searchParams.get('args') ?? '[]');

            const func = name ? module[name] : module.default;

            const result = await func(...args);
            return json(result);
          }, {exact: false});

          return handler;
        }
      `;
    },
  };
}
