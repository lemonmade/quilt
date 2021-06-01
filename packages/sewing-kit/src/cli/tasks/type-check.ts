import {Task} from '../../types';

import {TypeCheckTaskOptions} from '../../hooks';

import {createCommand, stepsForWorkspace, createStepRunner} from '../common';
import type {TaskContext} from '../common';

export const typeCheck = createCommand({}, async (_, context) => {
  await runTypeCheck(context, {});
});

export async function runTypeCheck(
  context: TaskContext,
  options: TypeCheckTaskOptions,
) {
  const {ui} = context;

  const steps = await stepsForWorkspace({
    ...context,
    options,
    coreHooks: () => ({}),
    task: Task.TypeCheck,
  });

  ui.log(`Running ${steps.length} steps for the workspace`);

  for (const step of steps) {
    ui.log(`Running step: ${step.label} (${step.name})`);
    await step.run(createStepRunner({ui}));
  }
}
