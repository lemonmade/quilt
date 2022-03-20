import {createWorkspacePlugin, createProjectPlugin} from '@quilted/sewing-kit';
import type {
  ResolvedHooks,
  DevelopAppConfigurationHooks,
  WorkspaceStepRunner,
} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-jest';
import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

import type {createBuilder} from './typescript';

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
      configure(
        ({
          rollupPlugins,
          vitePlugins,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          rollupPlugins?.(async (plugins) => {
            const {graphql} = await import('./rollup-parts');
            return [...plugins, graphql()];
          });

          vitePlugins?.(async (plugins) => {
            const {graphql} = await import('./rollup-parts');
            return [...plugins, graphql()];
          });
        },
      );
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
  const {createBuilder} = await import('./typescript');
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
