import {
  createWorkspace,
  quiltWorkspace,
  createWorkspacePlugin,
} from '@quilted/craft';
import type {} from '@quilted/sewing-kit-jest';

export default createWorkspace((workspace) => {
  workspace.use(
    quiltWorkspace(),
    createWorkspacePlugin({
      name: 'Quilt.IgnorePackages',
      test({configure, workspace}) {
        configure(({jestIgnore}) => {
          jestIgnore?.((patterns) => [
            ...patterns,
            workspace.fs.resolvePath('packages'),
          ]);
        });
      },
    }),
  );
});
