import type {WorkspacePlugin} from '../plugins';
import type {WorkspaceOptions} from '../model';

import {ConfigurationBuilder, ConfigurationKind} from './base';

class WorkspaceBuilder extends ConfigurationBuilder<
  WorkspacePlugin,
  WorkspaceOptions
> {
  constructor(root: string) {
    super(root, ConfigurationKind.Workspace);
  }
}

export function createWorkspace(
  create: (workspace: WorkspaceBuilder) => void | Promise<void>,
) {
  return async (root: string) => {
    const builder = new WorkspaceBuilder(root);
    await create(builder);
    return builder.finalize();
  };
}
