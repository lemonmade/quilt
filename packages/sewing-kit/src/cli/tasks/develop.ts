import {Task} from '../../types';
import {createWaterfallHook, DevelopTaskOptions} from '../../hooks';

import {createCommand, loadStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const develop = createCommand(
  {
    '--source-maps': Boolean,
  },
  async ({'--source-maps': sourceMaps = false}, context) => {
    await runDev(context, {
      sourceMaps,
    });
  },
);

export async function runDev(
  context: TaskContext,
  options: DevelopTaskOptions,
) {
  const {project: projectSteps} = await loadStepsForTask(Task.Develop, {
    ...context,
    options,
    coreHooksForProject: () => ({
      extensions: createWaterfallHook<string[]>(),
    }),
    coreHooksForWorkspace: () => ({}),
  });

  console.log(projectSteps);
}
