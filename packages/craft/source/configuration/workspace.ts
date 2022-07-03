import {relative} from 'path';

import type {WorkspacePlugin} from '../kit';
import {FileSystem, DiagnosticError, PackageJson, isPlugin} from '../kit';

import {nameFromFileSystem} from './shared';
import type {
  ConfigurationContext,
  WorkspaceConfiguration,
  WorkspaceConfigurationBuilder,
} from './types';

export function createWorkspace(
  create: (workspace: WorkspaceConfigurationBuilder) => void | Promise<void>,
): WorkspaceConfiguration {
  return async (context) => {
    const builder = createWorkspaceConfigurationBuilder(context);
    await create(builder);
    return builder.result();
  };
}

function createWorkspaceConfigurationBuilder({
  root,
  file,
}: ConfigurationContext): WorkspaceConfigurationBuilder {
  const fs = new FileSystem(root);
  const packageJson = PackageJson.load(root);

  let name = nameFromFileSystem(root, {packageJson});

  const workspacePlugins = new Set<WorkspacePlugin>();
  const projectPatterns = new Set<string>();

  const builder: WorkspaceConfigurationBuilder = {
    root,
    file,
    fs,
    packageJson,
    name(newName) {
      name = newName;
      return builder;
    },
    projects(...patterns) {
      for (const pattern of patterns) {
        projectPatterns.add(pattern);
      }

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
          throw new DiagnosticError({
            title: 'Invalid configuration file',
            content: `The ${relative(
              process.cwd(),
              file,
            )} configuration file uses project plugins for a workspace configuration`,
            suggestion: `When using createWorkspace(), you can only use plugins that target the overall workspace. If you only have a single project in your repo, consider switching from createWorkspace() to createProject().`,
          });
        }

        workspacePlugins.add(plugin);
      }

      return builder;
    },
    result() {
      return {
        kind: 'workspace',
        name,
        root,
        file,
        plugins: [...workspacePlugins],
        projects: [...projectPatterns],
      };
    },
  };

  return builder;
}
