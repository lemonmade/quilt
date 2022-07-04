import {Environment, Task, createWaterfallHook} from '../../kit';

import type {BuildTaskOptions} from '../../kit';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const build = createCommand(
  {
    '--env': String,
    '--no-cache': Boolean,
  },
  async ({'--env': rawEnv, '--no-cache': noCache = false}, context) => {
    const env = normalizeEnvironment(rawEnv);

    await runBuild(context, {
      env,
      cache: !noCache,
    });
  },
);

export async function runBuild(
  context: TaskContext,
  options: BuildTaskOptions,
) {
  await runStepsForTask(Task.Build, {
    ...context,
    options,
    coreHooksForProject: () => ({
      extensions: createWaterfallHook(),
      outputDirectory: createWaterfallHook(),
      runtimes: createWaterfallHook(),
    }),
    coreHooksForWorkspace: () => ({}),
  });
}

function normalizeEnvironment(rawEnv: string | undefined) {
  if (rawEnv == null) {
    return Environment.Production;
  }

  return /prod(?:uction)?/i.test(rawEnv)
    ? Environment.Production
    : Environment.Development;
}
