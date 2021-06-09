import {Environment, Task} from '../../types';

import {BuildTaskOptions, createWaterfallHook} from '../../hooks';

import {
  createCommand,
  loadStepsForTask,
  createStepRunner,
  ExcludedReason,
} from '../common';
import type {TaskContext} from '../common';
import {TargetRuntime} from '../../model';

export const build = createCommand(
  {
    '--env': String,
    '--no-cache': Boolean,
    '--source-maps': Boolean,
  },
  async (
    {
      '--env': rawEnv,
      '--source-maps': sourceMaps = true,
      '--no-cache': noCache = false,
    },
    context,
  ) => {
    const env = normalizeEnvironment(rawEnv);

    await runBuild(context, {
      env,
      sourceMaps,
      cache: !noCache,
    });
  },
);

export async function runBuild(
  context: TaskContext,
  options: BuildTaskOptions,
) {
  const {ui, filter} = context;

  const {workspace: workspaceSteps, project: projectSteps} =
    await loadStepsForTask(Task.Build, {
      ...context,
      options,
      coreHooksForProject: (project) => ({
        extensions: createWaterfallHook<string[]>(),
        outputDirectory: createWaterfallHook<string>(),
        runtime: createWaterfallHook({
          default: TargetRuntime.fromProject(project),
        }),
      }),
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

function normalizeEnvironment(rawEnv: string | undefined) {
  if (rawEnv == null) {
    return Environment.Production;
  }

  return /prod(?:uction)?/i.test(rawEnv)
    ? Environment.Production
    : Environment.Development;
}
