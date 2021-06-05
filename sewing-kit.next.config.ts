import {
  createWorkspace,
  quiltWorkspace,
  createWorkspacePlugin,
} from '@quilted/craft';

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
