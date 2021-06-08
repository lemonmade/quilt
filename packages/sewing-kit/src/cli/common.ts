import {promisify} from 'util';
import {join} from 'path';
import {execFile} from 'child_process';
import {Readable, Writable} from 'stream';

import arg from 'arg';
import type {Result, Spec} from 'arg';

import type {Project} from '../model';

import {Task} from '../types';

import {DiagnosticError, isDiagnosticError} from '../errors';

import {loadWorkspace} from '../configuration/load';
import type {LoadedWorkspace} from '../configuration/load';

import {createWaterfallHook, createSequenceHook} from '../hooks';
import type {
  ResolvedOptions,
  BuildOptionsForProject,
  BuildTaskOptions,
  DevelopTaskOptions,
  LintTaskOptions,
  TestTaskOptions,
  TypeCheckTaskOptions,
  BuildProjectTask,
  BuildWorkspaceOptions,
  BuildProjectConfigurationCoreHooks,
  ResolvedBuildProjectConfigurationHooks,
  DevelopProjectConfigurationCoreHooks,
  LintProjectConfigurationCoreHooks,
  TestProjectConfigurationCoreHooks,
  TypeCheckProjectConfigurationCoreHooks,
  BuildWorkspaceConfigurationCoreHooks,
  ResolvedBuildWorkspaceConfigurationHooks,
  DevelopWorkspaceConfigurationCoreHooks,
  LintWorkspaceConfigurationCoreHooks,
  TestWorkspaceConfigurationCoreHooks,
  TypeCheckWorkspaceConfigurationCoreHooks,
  SewingKitInternalContext,
} from '../hooks';

import type {BaseStepRunner, ProjectStep, WorkspaceStep} from '../steps';

import {Ui} from './ui';
import {InternalFileSystem} from '../utilities/fs';

export interface TaskContext extends LoadedWorkspace {
  readonly ui: Ui;
  readonly internal: SewingKitInternalContext;
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
      await run(flags as any, {
        workspace,
        ui,
        plugins,
        internal: {fs: new InternalFileSystem(workspace.root)},
      });
    } catch (error) {
      logError(error, ui);
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
  [Task.Test]: TestTaskOptions;
  [Task.TypeCheck]: TypeCheckTaskOptions;
}

interface ProjectCoreHooksTaskMap {
  [Task.Build]: BuildProjectConfigurationCoreHooks;
  [Task.Develop]: DevelopProjectConfigurationCoreHooks;
  [Task.Lint]: LintProjectConfigurationCoreHooks;
  [Task.Test]: TestProjectConfigurationCoreHooks;
  [Task.TypeCheck]: TypeCheckProjectConfigurationCoreHooks;
}

interface WorkspaceCoreHooksTaskMap {
  [Task.Build]: BuildWorkspaceConfigurationCoreHooks;
  [Task.Develop]: DevelopWorkspaceConfigurationCoreHooks;
  [Task.Lint]: LintWorkspaceConfigurationCoreHooks;
  [Task.TypeCheck]: TypeCheckWorkspaceConfigurationCoreHooks;
  [Task.Test]: TestWorkspaceConfigurationCoreHooks;
}

interface LoadStepOptions<TaskType extends Task> extends TaskContext {
  options: OptionsTaskMap[TaskType];
  coreHooksForProject<ProjectType extends Project = Project>(
    project: ProjectType,
  ): ProjectCoreHooksTaskMap[TaskType];
  coreHooksForWorkspace(): WorkspaceCoreHooksTaskMap[TaskType];
}

export async function loadStepsForTask<TaskType extends Task = Task>(
  task: TaskType,
  {
    plugins,
    options,
    workspace,
    internal,
    coreHooksForProject,
    coreHooksForWorkspace,
  }: LoadStepOptions<TaskType>,
) {
  const configurationHooksForProject = new Map<
    Project,
    ((hooks: ResolvedBuildProjectConfigurationHooks<any>) => void)[]
  >();
  const configurersForProject = new Map<
    Project,
    ((
      hooks: ResolvedBuildProjectConfigurationHooks<any>,
      options: ResolvedOptions<BuildOptionsForProject<any>>,
    ) => Promise<void>)[]
  >();
  const stepAddersForProject = new Map<
    Project,
    ((steps: ProjectStep<any>[]) => Promise<void>)[]
  >();
  const taskForProject = new Map<Project, BuildProjectTask<any>>();
  const resolvedConfigurationForProject = new Map<
    Project,
    Map<string, Promise<ResolvedBuildProjectConfigurationHooks<any>>>
  >();

  const configurationHooksForWorkspace: ((
    hooks: ResolvedBuildWorkspaceConfigurationHooks,
  ) => void)[] = [];
  const configurersForWorkspace: ((
    hooks: ResolvedBuildWorkspaceConfigurationHooks,
    options: ResolvedOptions<BuildWorkspaceOptions>,
  ) => Promise<void>)[] = [];
  const stepAddersForWorkspace: ((steps: WorkspaceStep[]) => Promise<void>)[] =
    [];
  const resolvedConfigurationForWorkspace = new Map<
    string,
    Promise<ResolvedBuildWorkspaceConfigurationHooks>
  >();
  const projectTaskHandlersForWorkspace: ((
    task: BuildProjectTask<any>,
  ) => void)[] = [];

  // Task is in dash case, but the method is in camelcase. This is a
  // quick-and-dirty replace to map between them.
  const pluginMethod = task.replace(/-(\w)/g, (_, letter) =>
    letter.toUpperCase(),
  ) as 'build';

  for (const plugin of plugins.for(workspace)) {
    await plugin[pluginMethod]?.({
      options: options as BuildTaskOptions,
      workspace,
      internal,
      hooks(adder) {
        configurationHooksForWorkspace.push((allHooks) => {
          Object.assign(
            allHooks,
            adder({
              waterfall: createWaterfallHook,
              sequence: createSequenceHook,
            }),
          );
        });
      },
      configure(configurer) {
        configurersForWorkspace.push(async (...args) => {
          await configurer(...args);
        });
      },
      run(adder) {
        stepAddersForWorkspace.push(async (steps) => {
          const newStepOrSteps = await adder((step) => step, {
            configuration: loadConfigurationForWorkspace,
            projectConfiguration: loadConfigurationForProject,
          });

          const newMaybeFalsySteps = Array.isArray(newStepOrSteps)
            ? newStepOrSteps
            : [newStepOrSteps];

          steps.push(
            ...newMaybeFalsySteps.filter((value): value is WorkspaceStep =>
              Boolean(value),
            ),
          );
        });
      },
      project(handler) {
        projectTaskHandlersForWorkspace.push(handler);
      },
    });
  }

  for (const projectTaskHandler of projectTaskHandlersForWorkspace) {
    for (const project of workspace.projects) {
      projectTaskHandler(getTaskForProject(project));
    }
  }

  for (const project of workspace.projects) {
    const projectPlugins = plugins.for(project);

    for (const plugin of projectPlugins) {
      plugin[pluginMethod]?.(getTaskForProject(project));
    }
  }

  const workspaceSteps: WorkspaceStep[] = [];

  for (const stepAdder of stepAddersForWorkspace) {
    await stepAdder(workspaceSteps);
  }

  const projectSteps = await Promise.all(
    workspace.projects.map(async (project) => {
      const stepAdders = stepAddersForProject.get(project) ?? [];
      const steps: ProjectStep<any>[] = [];

      for (const stepAdder of stepAdders) {
        await stepAdder(steps);
      }

      return {project, steps} as {
        project: Project;
        steps: ProjectStep<Project>[];
      };
    }),
  );

  return {workspace: workspaceSteps, project: projectSteps};

  function getTaskForProject(project: Project) {
    const existingTask = taskForProject.get(project);

    if (existingTask) return existingTask;

    let configurationHooks = configurationHooksForProject.get(project)!;

    if (configurationHooks == null) {
      configurationHooks = [];
      configurationHooksForProject.set(project, configurationHooks);
    }

    let configurers = configurersForProject.get(project)!;

    if (configurers == null) {
      configurers = [];
      configurersForProject.set(project, configurers);
    }

    let stepAdders = stepAddersForProject.get(project)!;

    if (stepAdders == null) {
      stepAdders = [];
      stepAddersForProject.set(project, stepAdders);
    }

    const task: BuildProjectTask = {
      project,
      workspace,
      internal,
      options: options as BuildTaskOptions,
      hooks(adder) {
        configurationHooks.push((allHooks) => {
          Object.assign(
            allHooks,
            adder({
              waterfall: createWaterfallHook,
              sequence: createSequenceHook,
            }),
          );
        });
      },
      configure(configurer) {
        configurers.push(async (...args) => {
          await configurer(...args);
        });
      },
      run(adder) {
        stepAdders.push(async (steps) => {
          const newStepOrSteps = await adder((step) => step, {
            configuration(options) {
              return loadConfigurationForProject(project, options);
            },
          });

          const newMaybeFalsySteps = Array.isArray(newStepOrSteps)
            ? newStepOrSteps
            : [newStepOrSteps];

          steps.push(
            ...newMaybeFalsySteps.filter((value): value is ProjectStep<any> =>
              Boolean(value),
            ),
          );
        });
      },
    };

    taskForProject.set(project, task);

    return task;
  }

  function loadConfigurationForProject<ProjectType extends Project = Project>(
    project: ProjectType,
    options: BuildWorkspaceOptions = {} as any,
  ) {
    const id = stringifyOptions(options);

    let configurationMap = resolvedConfigurationForProject.get(project);

    if (configurationMap == null) {
      configurationMap = new Map();
      resolvedConfigurationForProject.set(project, configurationMap);
    }

    if (configurationMap.has(id)) return configurationMap.get(id)!;

    const configurationPromise = (async () => {
      const hooks: ResolvedBuildProjectConfigurationHooks<any> =
        coreHooksForProject(
          project,
        ) as ResolvedBuildProjectConfigurationHooks<any>;

      const configurationHooks = configurationHooksForProject.get(project);
      const configurers = configurersForProject.get(project);

      if (configurationHooks) {
        for (const configurationHook of configurationHooks) {
          configurationHook(hooks);
        }
      }

      if (configurers) {
        for (const configurer of configurers) {
          await configurer(hooks, options);
        }
      }

      return hooks;
    })();

    configurationMap.set(id, configurationPromise);
    return configurationPromise;
  }

  function loadConfigurationForWorkspace(
    options: BuildWorkspaceOptions = {} as any,
  ) {
    const id = stringifyOptions(options);

    if (resolvedConfigurationForWorkspace.has(id))
      return resolvedConfigurationForWorkspace.get(id)!;

    const configurationPromise = (async () => {
      const hooks: ResolvedBuildWorkspaceConfigurationHooks =
        coreHooksForWorkspace() as ResolvedBuildWorkspaceConfigurationHooks;

      for (const configurationHook of configurationHooksForWorkspace) {
        configurationHook(hooks);
      }

      for (const configurer of configurersForWorkspace) {
        await configurer(hooks, options);
      }

      return hooks;
    })();

    resolvedConfigurationForWorkspace.set(id, configurationPromise);
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
      content: [error.stderr?.trim(), error.stdout?.trim()]
        .filter(Boolean)
        .join('\n'),
    });
  }
}

const promiseExec = promisify(execFile);

const exec: BaseStepRunner['exec'] = (
  command,
  args,
  {fromNodeModules, ...options} = {},
) => {
  const normalizedCommand = fromNodeModules
    ? join('node_modules/.bin', command)
    : command;

  const execPromise = promiseExec(normalizedCommand, args, options);

  const wrappedPromise = new Promise(
    // eslint-disable-next-line no-async-promise-executor
    async (resolve, reject) => {
      try {
        const result = await execPromise;
        resolve(result);
      } catch (error) {
        reject(new StepExecError(normalizedCommand, error));
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
