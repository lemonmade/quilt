import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  ResolvedHooks,
  DevelopConfigurationHooksForProject,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';
import type {ViteHooks} from '@quilted/sewing-kit-vite';

const ALIASES = {
  'react/jsx-runtime': 'preact/jsx-runtime',
  // Preact does not have a jsx-dev-runtime
  'react/jsx-dev-runtime': 'preact/jsx-runtime',
  react: '@quilted/preact-mini-compat',
  'react-dom/server': 'preact/compat/server',
  'react-dom': '@quilted/preact-mini-compat',
};

export function preact() {
  return createProjectPlugin({
    name: 'Quilt.Preact',
    develop({configure}) {
      configure(
        ({
          vitePlugins,
          viteResolveAliases,
        }: ResolvedHooks<ViteHooks & DevelopConfigurationHooksForProject>) => {
          viteResolveAliases?.((aliases) => {
            Object.assign(aliases, ALIASES);
            return aliases;
          });

          vitePlugins?.(async (plugins) => {
            const {default: prefresh} = await import('@prefresh/vite');

            plugins.push(prefresh());

            return plugins;
          });
        },
      );
    },
    build({configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          plugins.unshift(alias({entries: ALIASES}));

          return plugins;
        });
      });
    },
  });
}
