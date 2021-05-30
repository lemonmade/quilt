import {Readable, Writable} from 'stream';

import arg from 'arg';
import type {Result, Spec} from 'arg';

import {TargetRuntime} from '../model';
import type {Project} from '../model';

import {Task} from '../types';

import {isDiagnosticError} from '../errors';

import {loadWorkspace} from '../configuration/load';
import type {LoadedWorkspace} from '../configuration/load';

import {
  createWaterfallHook,
  createSequenceHook,
  BuildProjectOptions,
  ResolvedBuildProjectConfigurationHooks,
} from '../hooks';
import type {
  HookAdder,
  ProjectStepAdder,
  BuildProjectTask,
  BuildTaskOptions,
  DevelopTaskOptions,
} from '../hooks';

import type {ProjectStep} from '../steps';

import {Ui} from './ui';

export interface TaskContext extends LoadedWorkspace {
  readonly ui: Ui;
}

export function createCommand<Flags extends Spec>(
  flagSpec: Flags,
  run: (flags: Result<Flags>, context: TaskContext) => Promise<void>,
) {
  return async (
    argv: string[],
    {
      __internal: internalOptions = {},
    }: {
      __internal?: {
        stdin?: Readable;
        stdout?: Writable;
        stderr?: Writable;
      };
    } = {},
  ) => {
    const {
      '--root': root = process.cwd(),
      '--log-level': logLevel,
      '--interactive': isInteractive,
      ...flags
    } = arg(
      {
        ...flagSpec,
        '--root': String,
        '--log-level': String,
        '--interactive': Boolean,
        '--skip': [String],
        '--focus': [String],
        '--skip-step': [String],
        '--focus-step': [String],
      },
      {argv},
    );

    const ui = new Ui({
      ...(internalOptions as any),
      level: logLevel as any,
      isInteractive,
    });

    try {
      const {workspace, plugins} = await loadWorkspace(root as string);
      await run(flags as any, {workspace, ui, plugins});
    } catch (error) {
      logError(error, ui);
      // eslint-disable-next-line require-atomic-updates
      process.exitCode = 1;
    }
  };
}

export function logError(error: any, {error: log}: Ui) {
  if (isDiagnosticError(error)) {
    log((ui) =>
      ui.Text(error.title ?? 'An unexpected error occurred', {
        role: 'critical',
      }),
    );

    if (error.content) {
      log('');
      log(error.content);
    }

    if (error.suggestion) {
      log('');
      log((ui) => ui.Text('What do I do next?', {emphasis: 'strong'}));
      log(error.suggestion);
    }
  } else {
    log(
      (ui) =>
        `🧵 The following unexpected error occurred. We want to provide more useful suggestions when errors occur, so please open an issue on ${ui.Link(
          'sewing-kit repo',
          {
            to: 'https://github.com/Shopify/sewing-kit',
          },
        )} so that we can improve this message.`,
    );

    if (error.all != null) {
      log(error.all);
      log(error.stack);
    } else if (error.stderr != null) {
      log(error.stderr);
      log(error.stack);
    } else if (error.stdout == null) {
      log(error.stack);
    } else {
      log(error.stdout);
      log(error.stack);
    }
  }
}

interface ProjectOptionsTaskMap {
  [Task.Build]: BuildTaskOptions;
  [Task.Develop]: DevelopTaskOptions;
}

export async function stepsForProject<
  ProjectType extends Project = Project,
  TaskType extends Task = Task
>(
  project: ProjectType,
  {
    task,
    plugins,
    options,
    workspace,
  }: {task: TaskType; options: ProjectOptionsTaskMap[TaskType]} & TaskContext,
) {
  const projectPlugins = plugins.for(project);

  const configurationMap = new Map<
    string,
    Promise<ResolvedBuildProjectConfigurationHooks<ProjectType>>
  >();

  const hooksHook = createWaterfallHook<any>();
  const configureHook: BuildProjectTask['configure'] = createSequenceHook();
  const stepsHook = createWaterfallHook<ProjectStep<ProjectType>[]>();

  for (const plugin of projectPlugins) {
    await plugin[task as 'build']?.({
      options: options as any,
      project: project as any,
      workspace,
      hooks(adder: Parameters<HookAdder<any>>[0]) {
        hooksHook((allHooks) => {
          Object.assign(
            allHooks,
            adder({
              waterfall: createWaterfallHook,
              sequence: createSequenceHook,
            }),
          );
          return allHooks;
        });
      },
      configure: configureHook as any,
      run(adder: Parameters<ProjectStepAdder<any, any, any>>[0]) {
        stepsHook(async (steps) => {
          const newStepOrSteps = await adder((step) => step, {
            configuration: loadConfigurationForProject,
          });

          if (!newStepOrSteps) return steps;

          return Array.isArray(newStepOrSteps)
            ? [...steps, ...newStepOrSteps]
            : [...steps, newStepOrSteps];
        });
      },
    });
  }

  return stepsHook.run([]);

  function loadConfigurationForProject(
    options: BuildProjectOptions = {} as any,
    {
      target = TargetRuntime.fromProject(project),
    }: {target?: TargetRuntime} = {},
  ) {
    const id = stringifyOptions(options);

    if (configurationMap.has(id)) return configurationMap.get(id)!;

    const configurationPromise = (async () => {
      const hooks = await hooksHook.run({});
      await configureHook.run(hooks, {project, options, target, workspace});
      return hooks;
    })();

    configurationMap.set(id, configurationPromise);
    return configurationPromise;
  }
}

function stringifyOptions(variant: {[key: string]: any} = {}) {
  return Object.entries(variant)
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([key, value]) => {
      return value === true ? key : `${key}: ${value}`;
    })
    .join(',');
}
