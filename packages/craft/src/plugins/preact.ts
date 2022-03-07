import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  ResolvedHooks,
  DevelopConfigurationHooksForProject,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';
import type {ViteHooks} from '@quilted/sewing-kit-vite';

// We embed a version of Preact with `@quilted/quilt` so that consumers
// don’t need to install it manually. We also have some hand-rolled optimizations
// that improve the tree shakability of preact. We want to use these libraries
// in place of any references to `react` and `rect-dom`.
const ALIASES = {
  // Preact does not have a jsx-dev-runtime, so we don’t differentiate
  // in our re-exporting of it either.
  'react/jsx-runtime': '@quilted/quilt/react/jsx-runtime',
  'react/jsx-dev-runtime': '@quilted/quilt/react/jsx-runtime',
  react: '@quilted/quilt/react',
  'react-dom/server': '@quilted/quilt/react/server',
  'react-dom': '@quilted/quilt/react',
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
