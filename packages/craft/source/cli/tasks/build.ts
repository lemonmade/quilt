import {
  Environment,
  Task,
  createWaterfallHook,
  type BuildTaskOptions,
} from '../../kit.ts';
import {createCommand, runStepsForTask, type TaskContext} from '../common.ts';

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
