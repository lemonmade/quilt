import {Task} from '../../types';

import {TypeCheckTaskOptions} from '../../hooks';

import {createCommand, loadStepsForTask, createStepRunner} from '../common';
import type {TaskContext} from '../common';

export const typeCheck = createCommand({}, async (_, context) => {
  await runTypeCheck(context, {});
});

export async function runTypeCheck(
  context: TaskContext,
  options: TypeCheckTaskOptions,
) {
  const {ui} = context;

  const {workspace: steps} = await loadStepsForTask(Task.TypeCheck, {
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
