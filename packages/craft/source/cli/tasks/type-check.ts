import {Task} from '../../kit';

import type {TypeCheckTaskOptions} from '../../kit';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

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
