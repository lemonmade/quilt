import {createWorkspacePlugin, createProjectPlugin} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-jest';
import type {} from '@sewing-kit/plugin-rollup';

const PLUGIN = 'Quilt.GraphQL';
const STEP = `${PLUGIN}.TypeScriptDefs`;
const STEP_LABEL = 'build graphql typescript definitions';
const EXECUTABLE = 'node_modules/.bin/quilt-graphql-typescript';

export function graphql() {
  return createProjectPlugin(PLUGIN, ({tasks: {build, dev, test}}) => {
    build.hook(({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(({rollupPlugins}) => {
          rollupPlugins?.hook(async (plugins) => {
            const {graphql} = await import('./rollup-parts');
            return [...plugins, graphql()];
          });
        });
      });
    });

    dev.hook(({hooks}) => {
      hooks.configure.hook(({rollupPlugins}) => {
        rollupPlugins?.hook(async (plugins) => {
          const {graphql} = await import('./rollup-parts');
          return [...plugins, graphql()];
        });
      });
    });

    test.hook(({hooks}) => {
      hooks.configure.hook((hooks) => {
        hooks.jestTransforms?.hook((transforms) => ({
          ...transforms,
          [`\\.graphql$`]: '@quilted/graphql/jest',
        }));
      });
    });
  });
}

export function workspaceGraphQL() {
  return createWorkspacePlugin(PLUGIN, ({tasks, api}) => {
    function createTypeScriptDefinitionsStep({watch = false} = {}) {
      return api.createStep({id: STEP, label: STEP_LABEL}, async (runner) => {
        await runner.exec(EXECUTABLE, watch ? ['--watch'] : []);
      });
    }

    tasks.typeCheck.hook(({hooks}) => {
      hooks.pre.hook((steps) => [...steps, createTypeScriptDefinitionsStep()]);
    });

    // These don't work — sewing-kit hangs on the pre steps

    // tasks.test.hook(({hooks, options}) => {
    //   if (options.watch) {
    //     hooks.pre.hook((steps) => [
    //       ...steps,
    //       createTypeScriptDefinitionsStep({watch: true}),
    //     ]);
    //   }
    // });

    // tasks.dev.hook(({hooks}) => {
    //   hooks.pre.hook((steps) => [
    //     ...steps,
    //     createTypeScriptDefinitionsStep({watch: true}),
    //   ]);
    // });
  });
}
