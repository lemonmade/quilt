import {Task, DiagnosticError} from '../../kit';

import type {TestTaskOptions} from '../../kit';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const test = createCommand(
  {
    '--watch': Boolean,
    '--no-watch': Boolean,
    '--debug': Boolean,
    '--parallel': String,
    '--include-pattern': [String],
    '--exclude-pattern': [String],
  },
  async (
    {
      _: includePatterns,
      '--include-pattern': includePatternsAsFlag = [],
      '--exclude-pattern': excludePatterns = [],
      '--parallel': parallel,
      '--watch': watch = !process.env.CI,
      '--no-watch': noWatch,
      '--debug': debug = false,
    },
    context,
  ) => {
    await runTest(context, {
      watch: noWatch ? false : watch,
      debug,
      includePatterns: [...includePatterns, ...includePatternsAsFlag],
      excludePatterns,
      parallel: parallel ? validateParallel(parallel) : undefined,
    });
  },
);

export async function runTest(context: TaskContext, options: TestTaskOptions) {
  await runStepsForTask(Task.Test, {
    ...context,
    options,
    coreHooksForProject: () => ({}),
    coreHooksForWorkspace: () => ({}),
  });
}

const PARALLELISM_REGEX = /^\d+[/]\d+$/;

function validateParallel(parallel: string): `${number}/${number}` {
  if (!PARALLELISM_REGEX.test(parallel)) {
    throw new DiagnosticError({
      title: 'Invalid --parallel argument',
      content: `This argument must be in the format \`\${number}/\${number}\`, where the first number is the index of the current parallel, run, and the second number is the total number of parallel runs.`,
    });
  }

  return parallel as any;
}
