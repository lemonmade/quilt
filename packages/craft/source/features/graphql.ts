import type {createBuilder} from '@quilted/graphql/typescript';
import type {
  Configuration,
  Extensions as ConfigurationExtensions,
} from '@quilted/graphql/configuration';

import {createWorkspacePlugin, createProjectPlugin} from '../kit';
import type {WorkspaceStepRunner} from '../kit';
import type {} from '../tools/jest';
import type {} from '../tools/rollup';
import type {} from '../tools/vite';

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

export function workspaceGraphQL({package: pkg}: {package?: string} = {}) {
  return createWorkspacePlugin({
    name: WORKSPACE_NAME,
    build({run}) {
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
    develop({run}) {
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
    typeCheck({run}) {
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

async function runGraphQLTypes(
  step: WorkspaceStepRunner,
  {
    watch = false,
    ...options
  }: NonNullable<Parameters<typeof createBuilder>[1]> & {watch?: boolean},
) {
  const {createBuilder} = await import('@quilted/graphql/typescript');
  const builder = await createBuilder(undefined, options);

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
