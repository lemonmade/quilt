import {Task, createWaterfallHook, type DevelopTaskOptions} from '../../kit.ts';
import {createCommand, runStepsForTask, type TaskContext} from '../common.ts';

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
    coreHooksForProject: () => ({
      extensions: createWaterfallHook(),
      runtimes: createWaterfallHook(),
    }),
    coreHooksForWorkspace: () => ({}),
  });
}
