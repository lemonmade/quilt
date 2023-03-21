import {createProjectPlugin} from '../kit';
import type {Project, Workspace} from '../kit';

import {addRollupNodeBundleInclusion} from '../tools/rollup';
import type {} from '../tools/rollup';
import type {} from '../tools/vite';

import {sourceEntriesForProject} from '../features/packages';

export function aliasWorkspacePackages() {
  let internalSourceAliases: Promise<Record<string, string>> | undefined;
  let namedInternalPackages: {name: string; project: Project}[] | undefined;

  return createProjectPlugin({
    name: 'Quilt.Package.InternalConsumer',
    develop({configure, workspace}) {
      configure(({rollupPlugins, rollupNodeBundle, viteResolveAliases}) => {
        viteResolveAliases?.(async (aliases) => ({
          ...aliases,
          ...(await getAliases(workspace)),
        }));

        rollupNodeBundle?.((bundle) =>
          addRollupNodeBundleInclusion(
            getNamedInternalPackages(workspace).map(({name}) => name),
            bundle,
          ),
        );

        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          return [
            alias({
              entries: await getAliases(workspace),
            }),
            ...plugins,
          ];
        });
      });
    },
    build({configure, workspace}) {
      configure(({rollupPlugins, rollupNodeBundle}) => {
        rollupNodeBundle?.((bundle) =>
          addRollupNodeBundleInclusion(
            getNamedInternalPackages(workspace).map(({name}) => name),
            bundle,
          ),
        );

        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          return [
            alias({
              entries: await getAliases(workspace),
            }),
            ...plugins,
          ];
        });
      });
    },
  });

  function getNamedInternalPackages(workspace: Workspace) {
    if (namedInternalPackages != null) return namedInternalPackages;

    namedInternalPackages = [];

    for (const otherProject of workspace.projects) {
      const name = otherProject.packageJson?.name;
      if (name != null) {
        namedInternalPackages.push({name, project: otherProject});
      }
    }

    return namedInternalPackages;
  }

  function getAliases(workspace: Workspace) {
    internalSourceAliases ??= (async () => {
      const aliases: Record<string, string> = {};

      for (const {name, project: otherProject} of getNamedInternalPackages(
        workspace,
      )) {
        const packageEntries = await sourceEntriesForProject(otherProject);

        // We sort the entries from longest to shortest so that more specific entries take
        // precedence.
        for (const [entry, source] of Object.entries(packageEntries).sort(
          ([entryOne], [entryTwo]) => entryTwo.length - entryOne.length,
        )) {
          const aliasEntry = `${name}${
            entry === '.' ? '' : `/${entry.slice(2)}`
          }`;
          aliases[aliasEntry] = source;
        }
      }

      return aliases;
    })();

    return internalSourceAliases;
  }
}
