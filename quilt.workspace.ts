import * as path from 'path';
import {
  createWorkspace,
  quiltWorkspace,
  createWorkspacePlugin,
} from '@quilted/craft';
import type {} from '@quilted/craft/jest';

export default createWorkspace((workspace) => {
  workspace.projects(
    './quilt.workspace.ts',
    './packages/**/quilt.project.ts',
    './integrations/**/quilt.project.ts',
    '!./packages/create-quilt-app/template/quilt.project.ts',
    '!./packages/create/templates/**/quilt.project.ts',
    '!./packages/create/templates/**/quilt.workspace.ts',
  );

  workspace.use(
    quiltWorkspace({graphql: false}),
    createWorkspacePlugin({
      name: 'Quilt.WorkspaceExtras',
      test({configure, project}) {
        configure(({jestWatchIgnore}) => {
          jestWatchIgnore?.((ignore) => [
            ...ignore,
            path.resolve('tests/e2e/output'),
          ]);
        });

        project(({configure}) => {
          configure(({jestModuleMapper}) => {
            jestModuleMapper?.((moduleMapper) => {
              const newModuleMapper = {...moduleMapper};

              for (const [key, transform] of Object.entries(moduleMapper)) {
                if (/^[^]@quilted[/]react(-dom)?([$]|[/])/.test(key)) {
                  newModuleMapper[key.replace('^@quilted/', '^')] = transform;
                }
              }

              return newModuleMapper;
            });
          });
        });
      },
    }),
  );
});
