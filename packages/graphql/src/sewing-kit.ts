import {createWorkspacePlugin} from '@sewing-kit/plugins';

const PLUGIN = 'Quilt.GraphQL';
const STEP = `${PLUGIN}.TypeScriptDefs`;
const STEP_LABEL = 'build graphql typescript definitions';
const EXECUTABLE = 'node_modules/.bin/quilt-graphql-typescript';

export function graphql() {
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
