import {Task, type LintTaskOptions} from '../../kit.ts';
import {createCommand, runStepsForTask, type TaskContext} from '../common.ts';

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
