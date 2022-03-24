import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

import {createProjectPlugin, Workspace} from '../kit';
import type {
  Project,
  ResolvedHooks,
  DevelopAppConfigurationHooks,
} from '../kit';

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
      configure(
        ({
          rollupPlugins,
          vitePlugins,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
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
        },
      );
    },
  });
}

interface TSConfig {
  compilerOptions?: {paths?: Record<string, string[]>};
  references?: [{path: string}];
}

async function getAliasPlugin(project: Project, workspace: Workspace) {
  const [{default: alias}, tsconfig] = await Promise.all([
    import('@rollup/plugin-alias'),
    (async () => {
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
    })(),
  ]);

  const tsconfigPaths = tsconfig?.compilerOptions?.paths;

  if (tsconfigPaths == null) return undefined;

  return alias({
    entries: Object.entries(tsconfigPaths).map(([name, aliases]) => {
      return {
        find: name.includes('*')
          ? new RegExp(`^${name.replace(/\*/, '(.*)')}$`)
          : name,
        replacement: project.fs.resolvePath(aliases[0]).replace('*', '$1'),
      };
    }),
  });
}
