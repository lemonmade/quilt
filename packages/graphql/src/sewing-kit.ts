import {createWorkspacePlugin, createProjectPlugin} from '@quilted/sewing-kit';
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
          async run() {
            const [{execFile}, {promisify}] = await Promise.all([
              import('child_process'),
              import('util'),
            ]);

            const exec = promisify(execFile);

            await exec('node_modules/.bin/quilt-graphql-typescript');
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
          async run() {
            const [{execFile}, {promisify}] = await Promise.all([
              import('child_process'),
              import('util'),
            ]);

            const exec = promisify(execFile);

            await exec('node_modules/.bin/quilt-graphql-typescript');
          },
        }),
      );
    },
  });
}
