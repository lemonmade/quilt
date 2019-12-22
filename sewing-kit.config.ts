import {createWorkspace} from '@sewing-kit/config';
import {createWorkspaceTestPlugin} from '@sewing-kit/plugins';

import {eslintWorkspacePlugin} from '@sewing-kit/plugin-eslint';
import {javascriptWorkspacePlugin} from '@sewing-kit/plugin-javascript';
import {typeScriptWorkspacePlugin} from '@sewing-kit/plugin-typescript';
import {jestWorkspacePlugin} from '@sewing-kit/plugin-jest';

export default createWorkspace((workspace) => {
  workspace.plugins(
    eslintWorkspacePlugin,
    javascriptWorkspacePlugin,
    typeScriptWorkspacePlugin,
    jestWorkspacePlugin,
    createWorkspaceTestPlugin(
      'Quilted.WebWorkerTestIgnore',
      ({hooks, workspace}) => {
        hooks.configure.tap('Quilted.WebWorkerTestIgnore', (configure) => {
          configure.jestWatchIgnore?.tap(
            'Quilted.WebWorkerTestIgnore',
            (ignore) => [
              ...ignore,
              workspace.fs.resolvePath('packages/web-workers/tests/fixtures'),
            ],
          );
        });
      },
    ),
  );
});
