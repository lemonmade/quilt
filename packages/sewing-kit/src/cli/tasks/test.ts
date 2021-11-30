import {Task} from '../../types';

import {TestTaskOptions} from '../../hooks';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const test = createCommand(
  {'--watch': Boolean},
  async ({_: filePatterns, '--watch': watch = !process.env.CI}, context) => {
    await runTest(context, {watch, filePatterns});
  },
);

export async function runTest(context: TaskContext, options: TestTaskOptions) {
  await runStepsForTask(Task.Test, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });
}
