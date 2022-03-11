import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  Workspace,
  ResolvedHooks,
  DevelopAppConfigurationHooks,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

export function aliasWorkspacePackages() {
  return createProjectPlugin({
    name: 'Quilt.AliasWorkspacePackages',
    develop({configure, workspace}) {
      configure(
        ({
          rollupPlugins,
          viteResolveAliases,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          viteResolveAliases?.((aliases) => ({
            ...aliases,
            ...getAliases(workspace),
          }));

          rollupPlugins?.(async (plugins) => {
            const {default: alias} = await import('@rollup/plugin-alias');

            return [
              alias({
                entries: getAliases(workspace),
              }),
              ...plugins,
            ];
          });
        },
      );
    },
    build({configure, workspace}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          return [
            alias({
              entries: getAliases(workspace),
            }),
            ...plugins,
          ];
        });
      });
    },
  });
}

function getAliases(workspace: Workspace) {
  const aliases: Record<string, string> = {};

  for (const pkg of workspace.packages) {
    const sortedEntries = [...pkg.entries].sort(
      (entryOne, entryTwo) =>
        (entryOne.name ?? '').length - (entryTwo.name ?? '').length,
    );

    for (const entry of sortedEntries) {
      aliases[`${pkg.runtimeName}${entry.name ? `/${entry.name}` : ''}`] =
        pkg.fs.resolvePath(entry.source);
    }
  }

  return aliases;
}
