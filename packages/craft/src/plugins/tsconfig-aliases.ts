import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  Project,
  ResolvedHooks,
  DevelopAppConfigurationHooks,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

export function tsconfigAliases() {
  return createProjectPlugin({
    name: 'Quilt.TSConfigAliases',
    build({configure, project}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const plugin = await getAliasPlugin(project);

          if (plugin) plugins.unshift(plugin);

          return plugins;
        });
      });
    },
    develop({configure, project}) {
      configure(
        ({
          rollupPlugins,
          vitePlugins,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          rollupPlugins?.(async (plugins) => {
            const plugin = await getAliasPlugin(project);

            if (plugin) plugins.unshift(plugin);

            return plugins;
          });

          vitePlugins?.(async (plugins) => {
            const plugin = await getAliasPlugin(project);

            if (plugin) plugins.unshift(plugin);

            return plugins;
          });
        },
      );
    },
  });
}

async function getAliasPlugin(project: Project) {
  const [{default: alias}, tsconfig] = await Promise.all([
    import('@rollup/plugin-alias'),
    (async () => {
      try {
        const hasProjectTSConfig = await project.fs.hasFile(
          `tsconfig.${project.kind}.json`,
        );

        const tsconfig = hasProjectTSConfig
          ? await project.fs.read(`tsconfig.${project.kind}.json`)
          : await project.fs.read('tsconfig.json');

        return JSON.parse(tsconfig) as {
          compilerOptions?: {paths?: Record<string, string[]>};
        };
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
