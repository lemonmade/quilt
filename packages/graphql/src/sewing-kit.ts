import {createWorkspacePlugin, createProjectPlugin} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-jest';
import type {} from '@quilted/sewing-kit-rollup';

const NAME = 'Quilt.GraphQL';

export function graphql() {
  return createProjectPlugin({
    name: NAME,
    build({configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {graphql} = await import('./rollup-parts');
          return [...plugins, graphql()];
        });
      });
    },
    develop({configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {graphql} = await import('./rollup-parts');
          return [...plugins, graphql()];
        });
      });
    },
    test({configure}) {
      configure(({jestModuleMapper}) => {
        jestModuleMapper?.(async (moduleMapper) => {
          moduleMapper['\\.graphql$'] = '@quilted/graphql/jest';
          return moduleMapper;
        });
      });
    },
  });
}

const WORKSPACE_NAME = `${NAME}.TypeScriptDefinitions`;

export function workspaceGraphQL() {
  return createWorkspacePlugin({
    name: WORKSPACE_NAME,
    build({run}) {
      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            const result = await step.exec('quilt-graphql-typescript', [], {
              fromNodeModules: true,
            });

            if (result.stdout.trim()) step.log(result.stdout.trim());
          },
        }),
      );
    },
    develop({run}) {
      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            const result = await step.exec('quilt-graphql-typescript', [], {
              fromNodeModules: true,
            });

            if (result.stdout.trim()) step.log(result.stdout.trim());
          },
        }),
      );
    },
    typeCheck({run}) {
      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            const result = await step.exec('quilt-graphql-typescript', [], {
              fromNodeModules: true,
            });

            if (result.stdout.trim()) step.log(result.stdout.trim());
          },
        }),
      );
    },
  });
}
