import {Task} from '../../types';

import {LintTaskOptions} from '../../hooks';

import {createCommand, stepsForWorkspace} from '../common';
import type {TaskContext} from '../common';

export const lint = createCommand({}, async (_, context) => {
  await runLint(context, {});
});

export async function runLint(context: TaskContext, options: LintTaskOptions) {
  const {ui} = context;

  const steps = await stepsForWorkspace({
    ...context,
    options,
    coreHooks: () => ({}),
    task: Task.Lint,
  });

  ui.log(`Running ${steps.length} steps for the workspace`);

  for (const step of steps) {
    ui.log(`Running step: ${step.label} (${step.name})`);
    await step.run({});
  }
}
