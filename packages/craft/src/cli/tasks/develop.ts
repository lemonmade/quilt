import {Task, TargetRuntime, createWaterfallHook} from '../../kit';

import type {DevelopTaskOptions} from '../../kit';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const develop = createCommand(
  {'--debug': Boolean},
  async ({'--debug': debug = false}, context) => {
    await runDev(context, {debug});
  },
);

export async function runDev(
  context: TaskContext,
  options: DevelopTaskOptions,
) {
  await runStepsForTask(Task.Develop, {
    ...context,
    options,
    coreHooksForProject: (project) => ({
      extensions: createWaterfallHook<string[]>(),
      runtime: createWaterfallHook({
        default: TargetRuntime.fromProject(project),
      }),
    }),
    coreHooksForWorkspace: () => ({}),
  });
}
