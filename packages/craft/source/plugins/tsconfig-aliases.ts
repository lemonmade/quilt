import {createProjectPlugin, Workspace} from '../kit';
import type {Project} from '../kit';

import type {} from '../tools/jest';
import type {} from '../tools/rollup';
import type {} from '../tools/vite';

export function tsconfigAliases() {
  return createProjectPlugin({
    name: 'Quilt.TSConfigAliases',
    build({configure, project, workspace}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const plugin = await getAliasPlugin(project, workspace);

          if (plugin) plugins.unshift(plugin);

          return plugins;
        });
      });
    },
    develop({configure, project, workspace}) {
      configure(({rollupPlugins, vitePlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const plugin = await getAliasPlugin(project, workspace);

          if (plugin) plugins.unshift(plugin);

          return plugins;
        });

        vitePlugins?.(async (plugins) => {
          const plugin = await getAliasPlugin(project, workspace);

          if (plugin) plugins.unshift(plugin);

          return plugins;
        });
      });
    },
    test({configure, project, workspace}) {
      configure(({jestModuleMapper}) => {
        jestModuleMapper?.(async (moduleMapper) => {
          const tsconfig = await getTSConfig(project, workspace);
          const tsconfigPaths = tsconfig?.compilerOptions?.paths;

          if (tsconfigPaths == null) return moduleMapper;

          const newModuleMapper = {...moduleMapper};

          for (const [name, aliases] of Object.entries(tsconfigPaths)) {
            const fromPattern = name.replace(/\*/, '(.*)');

            newModuleMapper[`^${fromPattern}`] = project.fs
              .resolvePath(aliases[0]!)
              .replace('*', '$1');
          }

          return newModuleMapper;
        });
      });
    },
  });
}

interface TSConfig {
  compilerOptions?: {paths?: Record<string, string[]>};
  references?: [{path: string}];
}

async function getTSConfig(project: Project, workspace: Workspace) {
  try {
    const tsconfig = await project.fs.read('tsconfig.json');
    const projectIsWorkspace = project.fs.root === workspace.fs.root;

    const rootTSConfig = JSON.parse(tsconfig) as TSConfig;

    if (!projectIsWorkspace) return rootTSConfig;

    const references = rootTSConfig.references;

    if (references == null || references.length !== 1) {
      return rootTSConfig;
    }

    const firstReferencePath = references[0].path;

    const nestedTSConfig = await project.fs.read(
      firstReferencePath.endsWith('.json')
        ? project.fs.resolvePath(firstReferencePath)
        : project.fs.resolvePath(firstReferencePath, 'tsconfig.json'),
    );

    return JSON.parse(nestedTSConfig) as TSConfig;
  } catch {
    // intentional noop
  }
}

async function getAliasPlugin(project: Project, workspace: Workspace) {
  const [{default: alias}, tsconfig] = await Promise.all([
    import('@rollup/plugin-alias'),
    getTSConfig(project, workspace),
  ]);

  const tsconfigPaths = tsconfig?.compilerOptions?.paths;

  if (tsconfigPaths == null) return undefined;

  return alias({
    entries: Object.entries(tsconfigPaths).map(([name, aliases]) => {
      return {
        find: name.includes('*')
          ? new RegExp(`^${name.replace(/\*/, '(.*)')}$`)
          : name,
        replacement: project.fs.resolvePath(aliases[0]!).replace('*', '$1'),
      };
    }),
  });
}
