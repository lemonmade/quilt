import {Task, type TypeCheckTaskOptions} from '../../kit.ts';
import {createCommand, runStepsForTask, type TaskContext} from '../common.ts';

export const typeCheck = createCommand({}, async (_, context) => {
  await runTypeCheck(context, {});
});

export async function runTypeCheck(
  context: TaskContext,
  options: TypeCheckTaskOptions,
) {
  await runStepsForTask(Task.TypeCheck, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });
}
