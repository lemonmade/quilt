import {Task} from '../../types';

import {LintTaskOptions} from '../../hooks';

import {createCommand, loadStepsForTask, createStepRunner} from '../common';
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
  const {ui} = context;

  const {workspace: steps} = await loadStepsForTask(Task.Lint, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });

  ui.log(`Running ${steps.length} steps for the workspace`);

  for (const step of steps) {
    ui.log(`Running step: ${step.label} (${step.name})`);
    await step.run(createStepRunner({ui}));
  }
}
