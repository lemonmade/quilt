import {Task} from '../../types';
import {createWaterfallHook, DevelopTaskOptions} from '../../hooks';

import {createCommand, stepsForProject} from '../common';
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
  const projectSteps = await Promise.all(
    context.workspace.projects.map(async (project) => {
      return {
        project,
        steps: await stepsForProject(project, {
          ...context,
          options,
          coreHooks: () => ({
            extensions: createWaterfallHook(),
          }),
          task: Task.Develop,
        }),
      };
    }),
  );

  console.log(projectSteps);
}
