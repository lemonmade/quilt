import {Task} from '../../types';

import {TestTaskOptions} from '../../hooks';

import {createCommand, runStepsForTask} from '../common';
import type {TaskContext} from '../common';

export const test = createCommand(
  {
    '--watch': Boolean,
    '--no-watch': Boolean,
    '--debug': Boolean,
    '--include-pattern': [String],
    '--exclude-pattern': [String],
  },
  async (
    {
      _: includePatterns,
      '--include-pattern': includePatternsAsFlag = [],
      '--exclude-pattern': excludePatterns = [],
      '--watch': watch = !process.env.CI,
      '--no-watch': noWatch = false,
      '--debug': debug = false,
    },
    context,
  ) => {
    await runTest(context, {
      watch: noWatch ? false : watch,
      debug,
      includePatterns: [...includePatterns, ...includePatternsAsFlag],
      excludePatterns,
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
