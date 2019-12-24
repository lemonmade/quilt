import {createWorkspace} from '@sewing-kit/config';
import {createWorkspaceTestPlugin} from '@sewing-kit/plugins';

import {eslint} from '@sewing-kit/plugin-eslint';
import {jest} from '@sewing-kit/plugin-jest';
import {workspaceJavaScript} from '@sewing-kit/plugin-javascript';
import {workspaceTypeScript} from '@sewing-kit/plugin-typescript';

export default createWorkspace((workspace) => {
  workspace.use(
    eslint(),
    jest(),
    workspaceJavaScript(),
    workspaceTypeScript(),
    createWorkspaceTestPlugin(
      'Quilted.WebWorkerTestIgnore',
      ({hooks, workspace}) => {
        hooks.configure.hook((configure) => {
          configure.jestWatchIgnore?.hook((ignore) => [
            ...ignore,
            workspace.fs.resolvePath('packages/web-workers/tests/fixtures'),
          ]);
        });
      },
    ),
  );
});
