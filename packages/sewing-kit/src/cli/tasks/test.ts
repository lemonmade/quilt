import {Task} from '../../types';

import {TestTaskOptions} from '../../hooks';

import {createCommand, loadStepsForTask, createStepRunner} from '../common';
import type {TaskContext} from '../common';

export const test = createCommand({}, async (_, context) => {
  await runTest(context, {});
});

export async function runTest(context: TaskContext, options: TestTaskOptions) {
  const {ui} = context;

  const allSteps = await loadStepsForTask(Task.Test, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });

  const steps = allSteps.workspace;

  ui.log(`Running ${steps.length} steps for the workspace`);

  for (const step of steps) {
    ui.log(`Running step: ${step.label} (${step.name})`);
    await step.run(createStepRunner({ui}));
  }
}
