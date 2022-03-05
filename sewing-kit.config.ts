import * as path from 'path';
import {
  createWorkspace,
  quiltWorkspace,
  createWorkspacePlugin,
} from '@quilted/craft';
import type {} from '@quilted/sewing-kit-jest';

export default createWorkspace((workspace) => {
  workspace.use(
    quiltWorkspace({graphql: false}),
    createWorkspacePlugin({
      name: 'Quilt.IgnoreE2EOutput',
      test({configure}) {
        configure(({jestWatchIgnore, jestConfig}) => {
          jestWatchIgnore?.((ignore) => [
            ...ignore,
            path.resolve('tests/e2e/output'),
          ]);

          jestConfig?.((config) => {
            return {
              ...config,
              transformIgnorePatterns: [
                ...(config.transformIgnorePatterns ?? []),
                // get-port is ESM, we will just transpile it like source code
                'node_modules/(?!get-port)',
              ],
            };
          });
        });
      },
    }),
  );
});
