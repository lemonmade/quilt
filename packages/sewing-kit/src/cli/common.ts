import {promisify} from 'util';
import {join} from 'path';
import {execFile} from 'child_process';
import {Readable, Writable} from 'stream';

import arg from 'arg';
import type {Result, Spec} from 'arg';

import {TargetRuntime} from '../model';
import type {Project} from '../model';

import {Runtime, Task} from '../types';

import {DiagnosticError, isDiagnosticError} from '../errors';

import {loadWorkspace} from '../configuration/load';
import type {LoadedWorkspace} from '../configuration/load';

import {
  createWaterfallHook,
  createSequenceHook,
  WorkspaceStepAdder,
} from '../hooks';
import type {
  HookAdder,
  ProjectStepAdder,
  BuildTaskOptions,
  DevelopTaskOptions,
  LintTaskOptions,
  BuildProjectTask,
  BuildWorkspaceTask,
  BuildProjectOptions,
  BuildWorkspaceOptions,
  BuildProjectConfigurationCoreHooks,
  ResolvedBuildProjectConfigurationHooks,
  DevelopProjectConfigurationCoreHooks,
  LintProjectConfigurationCoreHooks,
  BuildWorkspaceConfigurationCoreHooks,
  ResolvedBuildWorkspaceConfigurationHooks,
  DevelopWorkspaceConfigurationCoreHooks,
  LintWorkspaceConfigurationCoreHooks,
} from '../hooks';

import type {BaseStepRunner, ProjectStep, WorkspaceStep} from '../steps';

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

interface OptionsTaskMap {
  [Task.Build]: BuildTaskOptions;
  [Task.Develop]: DevelopTaskOptions;
  [Task.Lint]: LintTaskOptions;
}

interface ProjectCoreHooksTaskMap {
  [Task.Build]: BuildProjectConfigurationCoreHooks;
  [Task.Develop]: DevelopProjectConfigurationCoreHooks;
  [Task.Lint]: LintProjectConfigurationCoreHooks;
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
    coreHooks,
    workspace,
  }: {
    task: TaskType;
    options: OptionsTaskMap[TaskType];
    coreHooks: () => ProjectCoreHooksTaskMap[TaskType];
  } & TaskContext,
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
      await configureHook.run(
        {...hooks, ...coreHooks()},
        {project, options, target, workspace},
      );
      return hooks;
    })();

    configurationMap.set(id, configurationPromise);
    return configurationPromise;
  }
}

interface WorkspaceCoreHooksTaskMap {
  [Task.Build]: BuildWorkspaceConfigurationCoreHooks;
  [Task.Develop]: DevelopWorkspaceConfigurationCoreHooks;
  [Task.Lint]: LintWorkspaceConfigurationCoreHooks;
}

export async function stepsForWorkspace<TaskType extends Task = Task>({
  task,
  plugins,
  options,
  coreHooks,
  workspace,
}: {
  task: TaskType;
  options: OptionsTaskMap[TaskType];
  coreHooks: () => WorkspaceCoreHooksTaskMap[TaskType];
} & TaskContext) {
  const workspacePlugins = plugins.for(workspace);

  const configurationMap = new Map<
    string,
    Promise<ResolvedBuildWorkspaceConfigurationHooks>
  >();

  const hooksHook = createWaterfallHook<any>();
  const configureHook: BuildWorkspaceTask['configure'] = createSequenceHook();
  const stepsHook = createWaterfallHook<WorkspaceStep[]>();

  for (const plugin of workspacePlugins) {
    await plugin[task as 'build']?.({
      options: options as any,
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
      run(adder: Parameters<WorkspaceStepAdder<any, any>>[0]) {
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
    options: BuildWorkspaceOptions = {} as any,
    {target = new TargetRuntime([Runtime.Node])}: {target?: TargetRuntime} = {},
  ) {
    const id = stringifyOptions(options);

    if (configurationMap.has(id)) return configurationMap.get(id)!;

    const configurationPromise = (async () => {
      const hooks = await hooksHook.run({});
      await configureHook.run(
        {...hooks, ...coreHooks()},
        {options, target, workspace},
      );
      return hooks;
    })();

    configurationMap.set(id, configurationPromise);
    return configurationPromise;
  }
}

export function createStepRunner({ui}: {ui: Ui}): BaseStepRunner {
  return {
    exec,
    log(...args) {
      ui.log(...args);
    },
    fail() {
      // TODO something that actually blows up the execution...
      process.exitCode = 1;
    },
  };
}

export class StepExecError extends DiagnosticError {
  get stderr() {
    return this.error.stderr;
  }

  get stdout() {
    return this.error.stdout;
  }

  constructor(command: string, private readonly error: any) {
    super({
      title: `Command \`${command}\` failed`,
      content: error.stderr?.trim() || error.stdout?.trim(),
    });
  }
}

const promiseExec = promisify(execFile);

const exec: BaseStepRunner['exec'] = (
  command,
  args,
  {fromNodeModules, ...options} = {},
) => {
  const execPromise = promiseExec(command, args, options);

  const wrappedPromise = new Promise(
    // eslint-disable-next-line no-async-promise-executor
    async (resolve, reject) => {
      try {
        const result = await execPromise;
        resolve(result);
      } catch (error) {
        reject(
          new StepExecError(
            fromNodeModules ? join('node_modules/.bin', command) : command,
            error,
          ),
        );
      }
    },
  ) as any;

  wrappedPromise.child = execPromise.child;
  return wrappedPromise;
};

function stringifyOptions(variant: {[key: string]: any} = {}) {
  return Object.entries(variant)
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([key, value]) => {
      return value === true ? key : `${key}: ${value}`;
    })
    .join(',');
}
