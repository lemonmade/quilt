import * as path from 'path';
import {createRequire} from 'module';

import type {createBuilder} from '@quilted/graphql/typescript';
import type {
  Configuration,
  Extensions as ConfigurationExtensions,
} from '@quilted/graphql/configuration';

import {createWorkspacePlugin, createProjectPlugin} from '../kit.ts';
import type {Workspace, WorkspaceStepRunner} from '../kit.ts';
import type {} from '../tools/jest.ts';
import type {} from '../tools/rollup.ts';
import type {} from '../tools/vite.ts';

export type {Configuration, ConfigurationExtensions};

const NAME = 'Quilt.GraphQL';

export function graphql() {
  return createProjectPlugin({
    name: NAME,
    build({configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {graphql} = await import('@quilted/graphql/rollup');
          return [...plugins, graphql()];
        });
      });
    },
    develop({configure}) {
      configure(({rollupPlugins, vitePlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {graphql} = await import('@quilted/graphql/rollup');
          return [...plugins, graphql()];
        });

        vitePlugins?.(async (plugins) => {
          const {graphql} = await import('@quilted/graphql/rollup');
          return [...plugins, graphql()];
        });
      });
    },
    test({configure}) {
      const require = createRequire(import.meta.url);

      configure(({jestTransforms}) => {
        jestTransforms?.((transforms) => {
          return {
            ...transforms,
            ['\\.graphql$']: require.resolve('@quilted/graphql/jest'),
          };
        });
      });
    },
  });
}

const WORKSPACE_NAME = `${NAME}.TypeScriptDefinitions`;

export function workspaceGraphQL({package: pkg}: {package?: string} = {}) {
  return createWorkspacePlugin({
    name: WORKSPACE_NAME,
    async build({run, workspace}) {
      if (!(await workspaceHasGraphQL(workspace))) return;

      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            await runGraphQLTypes(step, {package: pkg});
          },
        }),
      );
    },
    async develop({run, workspace}) {
      if (!(await workspaceHasGraphQL(workspace))) return;

      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            await runGraphQLTypes(step, {package: pkg, watch: true});
          },
        }),
      );
    },
    async typeCheck({run, workspace}) {
      if (!(await workspaceHasGraphQL(workspace))) return;

      run((step) =>
        step({
          name: WORKSPACE_NAME,
          label: 'Build GraphQL TypeScript definitions',
          stage: 'pre',
          async run(step) {
            await runGraphQLTypes(step, {package: pkg});
          },
        }),
      );
    },
  });
}

async function workspaceHasGraphQL(workspace: Workspace) {
  const configs = await workspace.fs.glob(['.graphqlrc*', 'graphql.config*']);
  return configs.length > 0;
}

async function runGraphQLTypes(
  step: WorkspaceStepRunner,
  {
    watch = false,
    ...options
  }: NonNullable<Parameters<typeof createBuilder>[1]> & {watch?: boolean},
) {
  const {createBuilder} = await import('@quilted/graphql/typescript');
  const builder = await createBuilder(undefined, options);

  builder.on('document:build:error', ({error}) => {
    step.log((ui) =>
      ui.Text(error.message ?? 'An unexpected error occurred', {
        role: 'critical',
      }),
    );

    if (error.stack) {
      step.log(error.stack);
    }
  });

  builder.on('document:build:error', ({error, documentPath}) => {
    step.log(
      (ui) =>
        `${ui.Text('Error', {
          role: 'critical',
        })} Failed to build GraphQL types for ${documentPath.replace(
          path.join(process.cwd(), '/'),
          '',
        )}`,
    );

    step.log(error.message);

    if (error.stack) {
      step.log((ui) => ui.Text(error.stack!, {emphasis: 'subdued'}));
    }

    if (!watch) {
      process.exitCode = 1;
    }
  });

  builder.on('error', (error) => {
    step.log((ui) =>
      ui.Text(error.message ?? 'An unexpected error occurred', {
        role: 'critical',
      }),
    );

    if (error.stack) {
      step.log(error.stack);
    }
  });

  if (watch) {
    await builder.watch();
  } else {
    await builder.run();
  }
}
