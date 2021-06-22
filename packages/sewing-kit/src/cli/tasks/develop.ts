import {Task} from '../../types';
import {createWaterfallHook, DevelopTaskOptions} from '../../hooks';
import {TargetRuntime} from '../../model';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const develop = createCommand({}, async (_, context) => {
  await runDev(context, {});
});

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
