import {Task} from '../../types';

import {LintTaskOptions} from '../../hooks';

import {
  createCommand,
  loadStepsForTask,
  createStepRunner,
  ExcludedReason,
} from '../common';
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
  const {ui, filter} = context;

  const {workspace: workspaceSteps, project: projectSteps} =
    await loadStepsForTask(Task.Lint, {
      ...context,
      options,
      coreHooksForProject: () => ({}),
      coreHooksForWorkspace: () => ({}),
    });

  if (workspaceSteps.length > 0) {
    ui.log(`Running ${workspaceSteps.length} steps for workspace`);

    for (const step of workspaceSteps) {
      const inclusion = filter.includeStep(step);

      if (inclusion.included) {
        ui.log(`Running step: ${step.label} (${step.name})`);
        await step.run(createStepRunner({ui}));
      } else {
        ui.log(
          `Skipping step: ${step.label} (${step.name}, reason: ${
            inclusion.reason === ExcludedReason.Skipped
              ? 'skipped'
              : 'other step marked as only'
          })`,
        );
      }
    }
  }

  for (const {project, steps} of projectSteps) {
    if (steps.length === 0) continue;

    const inclusion = filter.includeProject(project);

    if (inclusion.included) {
      ui.log(`Running ${steps.length} steps for project ${project.id}`);
    } else {
      ui.log(
        `Skipping project ${project.id} (including its ${
          steps.length
        } steps, reason: ${
          inclusion.reason === ExcludedReason.Skipped
            ? 'skipped'
            : 'other project marked as only'
        })`,
      );

      continue;
    }

    for (const step of steps) {
      const inclusion = filter.includeStep(step);

      if (inclusion.included) {
        ui.log(`Running step: ${step.label} (${step.name})`);
        await step.run(createStepRunner({ui}));
      } else {
        ui.log(
          `Skipping step: ${step.label} (${step.name}, reason: ${
            inclusion.reason === ExcludedReason.Skipped
              ? 'skipped'
              : 'other step marked as only'
          })`,
        );
      }
    }
  }
}
