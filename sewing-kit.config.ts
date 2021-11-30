import * as path from 'path';
import {
  createWorkspace,
  quiltWorkspace,
  createWorkspacePlugin,
} from '@quilted/craft';

export default createWorkspace((workspace) => {
  workspace.use(
    quiltWorkspace({graphql: false}),
    createWorkspacePlugin({
      name: 'Quilt.IgnoreE2EOutput',
      test({configure}) {
        configure(({jestWatchIgnore}) => {
          jestWatchIgnore?.((ignore) => [
            ...ignore,
            path.resolve('tests/e2e/output'),
          ]);
        });
      },
    }),
  );
});
