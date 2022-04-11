import {Task} from '../../kit';

import type {LintTaskOptions} from '../../kit';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const lint = createCommand(
  {
    '--fix': Boolean,
  },
  async ({'--fix': fix = false}, context) => {
    await runLint(context, {fix});
  },
);

export async function runLint(context: TaskContext, options: LintTaskOptions) {
  await runStepsForTask(Task.Lint, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });
}
