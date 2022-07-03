import {createProjectPlugin} from '../kit';
import type {Project, Workspace} from '../kit';

import type {} from '../tools/rollup';
import type {} from '../tools/vite';

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

    const entries: [string, string][] = [];

    for (const [exportPath, exportCondition] of Object.entries(
      (project.packageJson?.raw.exports ?? {}) as Record<
        string,
        string | Record<string, string>
      >,
    )) {
      const targetFile =
        typeof exportCondition === 'string'
          ? exportCondition
          : exportCondition['quilt:from-source'] ??
            Object.values(exportCondition).pop()!;

      const sourceFile = targetFile.includes('/build/')
        ? (
            await otherProject.fs.glob(
              targetFile.replace('/build/', '/*/').replace(/\.[\w]+$/, '.*'),
              {ignore: [otherProject.fs.resolvePath(targetFile)]},
            )
          )[0]!
        : otherProject.fs.resolvePath(targetFile);

      const exportEntry = `${name}${
        exportPath === './' ? '' : `${exportPath.slice(2)}`
      }`;

      entries.push([exportEntry, sourceFile]);
    }

    for (const [exportEntry, sourceFile] of entries.sort(
      ([entryOne], [entryTwo]) => entryTwo.length - entryOne.length,
    )) {
      aliases[exportEntry] = sourceFile;
    }
  }

  return aliases;
}
