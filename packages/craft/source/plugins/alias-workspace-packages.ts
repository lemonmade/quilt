import {createProjectPlugin} from '../kit';
import type {Project, Workspace} from '../kit';

import type {} from '../tools/rollup';
import type {} from '../tools/vite';

import {sourceEntriesForProject} from '../features/packages';

export function aliasWorkspacePackages() {
  return createProjectPlugin({
    name: 'Quilt.AliasWorkspacePackages',
    develop({configure, project, workspace}) {
      if (project.packageJson == null) return;

      configure(({rollupPlugins, viteResolveAliases}) => {
        viteResolveAliases?.(async (aliases) => ({
          ...aliases,
          ...(await getAliases(project, workspace)),
        }));

        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          return [
            alias({
              entries: await getAliases(project, workspace),
            }),
            ...plugins,
          ];
        });
      });
    },
    build({configure, project, workspace}) {
      if (project.packageJson == null) return;

      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          return [
            alias({
              entries: await getAliases(project, workspace),
            }),
            ...plugins,
          ];
        });
      });
    },
  });
}

async function getAliases(project: Project, workspace: Workspace) {
  const aliases: Record<string, string> = {};

  for (const otherProject of workspace.projects) {
    const name = otherProject.packageJson?.name;

    if (name == null || !project.hasDependency(name, {all: true})) continue;

    const packageEntries = await sourceEntriesForProject(otherProject);

    // We sort the entries from longest to shortest so that more specific entries take
    // precedence.
    for (const [entry, source] of Object.entries(packageEntries).sort(
      ([entryOne], [entryTwo]) => entryTwo.length - entryOne.length,
    )) {
      const aliasEntry = `${name}${entry === '.' ? '' : `/${entry.slice(2)}`}`;
      aliases[aliasEntry] = source;
    }
  }

  return aliases;
}
