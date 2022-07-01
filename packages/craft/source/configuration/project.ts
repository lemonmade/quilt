import {relative} from 'path';

import type {WorkspacePlugin, ProjectPlugin} from '../kit';
import {FileSystem, DiagnosticError, PackageJson, isPlugin} from '../kit';

import type {
  ProjectConfiguration,
  ConfigurationContext,
  ProjectConfigurationBuilder,
} from './types';

export function createProject(
  create: (workspace: ProjectConfigurationBuilder) => void | Promise<void>,
): ProjectConfiguration {
  return async (context) => {
    const builder = createProjectConfigurationBuilder(context);
    await create(builder);
    return builder.result();
  };
}

function createProjectConfigurationBuilder({
  file,
  root,
}: ConfigurationContext): ProjectConfigurationBuilder {
  let name: string | undefined;

  const projectPlugins = new Set<ProjectPlugin>();
  const workspacePlugins = new Set<WorkspacePlugin>();

  const builder: ProjectConfigurationBuilder = {
    root,
    fs: new FileSystem(root),
    packageJson: PackageJson.load(root),
    name(newName) {
      name = newName;
      return builder;
    },
    use(...plugins) {
      for (const pluginTyped of plugins) {
        const plugin = pluginTyped as any;

        if (!plugin) continue;

        if (!isPlugin(plugin)) {
          throw new DiagnosticError({
            title: 'Invalid configuration file',
            content: `The ${relative(
              process.cwd(),
              file,
            )} configuration file contains invalid plugins`,
            suggestion: `Make sure that all plugins included in the configuration file were generated using the utilities from @quilted/craft. If this is the case, you may have duplicate versions of some @quilted dependencies. Resolve any duplicate versions and try your command again.`,
          });
        }

        if (plugin.target === 'project') {
          projectPlugins.add(plugin);
        } else {
          workspacePlugins.add(plugin);
        }
      }

      return builder;
    },
    result() {
      return {
        kind: 'project',
        name,
        plugins: [...projectPlugins],
        workspacePlugins: [...workspacePlugins],
      };
    },
  };

  return builder;
}
