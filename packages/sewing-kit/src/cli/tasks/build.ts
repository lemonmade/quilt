import {Environment, Task} from '../../types';

import {BuildTaskOptions, createWaterfallHook} from '../../hooks';

import {createCommand, loadStepsForTask, createStepRunner} from '../common';
import type {TaskContext} from '../common';

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
  const {ui} = context;

  const {project: projectSteps} = await loadStepsForTask(Task.Build, {
    ...context,
    options,
    coreHooksForProject: () => ({
      extensions: createWaterfallHook<string[]>(),
      outputDirectory: createWaterfallHook<string>(),
    }),
    coreHooksForWorkspace: () => ({}),
  });

  for (const {project, steps} of projectSteps) {
    ui.log(`Running ${steps.length} steps for project ${project.id}`);

    for (const step of steps) {
      ui.log(`Running step: ${step.label} (${step.name})`);
      await step.run(createStepRunner({ui}));
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
