import {promisify} from 'util';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {exec as childExec, execSync} from 'child_process';
import {Readable, Writable} from 'stream';

import arg from 'arg';
import type {Result, Spec} from 'arg';

import type {Project} from '../model';

import type {AnyStep, StepNeed} from '../steps';
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
import type {AnyPlugin, WorkspacePlugin} from '../plugins';

import {Ui} from './ui';
import {InternalFileSystem} from '../utilities/fs';

export enum IncludedReason {
  Normal,
  Only,
}

export enum ExcludedReason {
  Only,
  Skipped,
}

export type InclusionResult =
  | {included: true; reason: IncludedReason}
  | {included: false; reason: ExcludedReason};

export interface TaskFilter {
  includeWorkspace(): InclusionResult;
  includeProject(project: Project): InclusionResult;
  includeStep(step: AnyStep): InclusionResult;
}

export interface TaskContext extends LoadedWorkspace {
  readonly ui: Ui;
  readonly filter: TaskFilter;
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
      '--projects': projects,
      '--log-level': logLevel,
      '--interactive': isInteractive,
      '--skip-project': skipProjects,
      '--only-project': onlyProjects,
      '--skip-workspace': skipWorkspace = false,
      '--only-workspace': onlyWorkspace = false,
      '--skip-step': skipSteps,
      '--only-step': onlySteps,
      ...flags
    } = arg(
      {
        ...flagSpec,
        '--root': String,
        '--projects': [String],
        '--log-level': String,
        '--interactive': Boolean,
        '--skip-project': [String],
        '--only-project': [String],
        '--skip-workspace': Boolean,
        '--only-workspace': Boolean,
        '--skip-step': [String],
        '--only-step': [String],
      },
      {argv},
    );

    const ui = new Ui({
      ...(internalOptions as any),
      level: logLevel as any,
      isInteractive,
    });

    try {
      const {workspace, plugins} = await loadWorkspace(root as string, {
        projectPatterns: projects,
      });
      await run(flags as any, {
        workspace,
        ui,
        plugins,
        filter: createFilter({
          onlySteps,
          skipSteps,
          onlyProjects,
          skipProjects,
          onlyWorkspace: onlyWorkspace as boolean,
          skipWorkspace: skipWorkspace as boolean,
        }),
        internal: {fs: new InternalFileSystem(workspace.root)},
      });
    } catch (error) {
      logError(error, ui);
      process.exitCode = 1;
    }
  };
}

function createFilter({
  onlySteps: rawOnlySteps = [],
  skipSteps: rawSkipSteps = [],
  onlyProjects: rawOnlyProjects = [],
  skipProjects: rawSkipProjects = [],
  onlyWorkspace = false,
  skipWorkspace = false,
}: {
  onlySteps?: string[];
  skipSteps?: string[];
  onlyProjects?: string[];
  skipProjects?: string[];
  onlyWorkspace?: boolean;
  skipWorkspace?: boolean;
}): TaskFilter {
  const normalize = (values: string[]) => {
    const mapped = values.flatMap((value) => {
      return value
        .split(',')
        .map((subValue) => subValue.trim().replace(/[-_]/g, '').toLowerCase());
    });

    return new Set(mapped);
  };

  const onlySteps = normalize(rawOnlySteps);
  const skipSteps = normalize(rawSkipSteps);
  const onlyProjects = normalize(rawOnlyProjects);
  const skipProjects = normalize(rawSkipProjects);

  return {
    includeProject(project) {
      if (onlyWorkspace) {
        return {included: false, reason: ExcludedReason.Only};
      }

      const projectKind = project.kind.toLowerCase();
      const nameSearch = project.name.replace(/[-_]/g, '').toLowerCase();
      const namespaceParts = nameSearch.split('.');
      const kindSearch = `${projectKind}:${nameSearch}`;
      const kindNamespaceSearch = `${projectKind}:*`;
      const searches: string[] = [kindNamespaceSearch, kindSearch, nameSearch];

      if (namespaceParts.length > 1) {
        let currentNamespace = namespaceParts[0];
        searches.push(
          `${projectKind}:${currentNamespace}.*`,
          `${currentNamespace}.*`,
        );

        for (const searchPart of namespaceParts.slice(1)) {
          currentNamespace = `${currentNamespace}.${searchPart}`;
          searches.push(
            `${projectKind}:${currentNamespace}.*`,
            `${currentNamespace}.*`,
          );
        }
      }

      if (onlyProjects.size > 0) {
        return searches.some((search) => onlyProjects.has(search))
          ? {included: true, reason: IncludedReason.Only}
          : {included: false, reason: ExcludedReason.Only};
      }

      return searches.some((search) => skipProjects.has(search))
        ? {included: false, reason: ExcludedReason.Skipped}
        : {included: true, reason: IncludedReason.Normal};
    },
    includeWorkspace() {
      if (onlyWorkspace) {
        return {included: true, reason: IncludedReason.Only};
      } else if (skipWorkspace) {
        return {included: false, reason: ExcludedReason.Skipped};
      } else {
        return {included: true, reason: IncludedReason.Normal};
      }
    },
    includeStep(step) {
      if (onlyWorkspace && step.target.kind !== 'workspace') {
        return {included: false, reason: ExcludedReason.Only};
      }

      const nameSearch = step.name.replace(/[-_]/g, '').toLowerCase();
      const namespaceParts = nameSearch.split('.');
      const searches: string[] = [nameSearch];

      if (namespaceParts.length > 1) {
        let currentNamespace = namespaceParts[0];
        searches.push(`${currentNamespace}.*`);

        for (const searchPart of namespaceParts.slice(1)) {
          currentNamespace = `${currentNamespace}.${searchPart}`;
          searches.push(`${currentNamespace}.*`);
        }
      }

      if (onlySteps.size > 0) {
        return searches.some((search) => onlySteps.has(search))
          ? {included: true, reason: IncludedReason.Only}
          : {included: false, reason: ExcludedReason.Only};
      }

      return skipSteps.size > 0 &&
        searches.some((search) => skipSteps.has(search))
        ? {included: false, reason: ExcludedReason.Skipped}
        : {included: true, reason: IncludedReason.Normal};
    },
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
            to: 'https://github.com/lemonmade/quilt',
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

interface RunStepOptions<TaskType extends Task> extends TaskContext {
  options: OptionsTaskMap[TaskType];
  coreHooksForProject<ProjectType extends Project = Project>(
    project: ProjectType,
  ): ProjectCoreHooksTaskMap[TaskType];
  coreHooksForWorkspace(): WorkspaceCoreHooksTaskMap[TaskType];
}

interface StepList {
  pre: AnyStep[];
  default: AnyStep[];
  post: AnyStep[];
}

export async function runStepsForTask<TaskType extends Task>(
  task: TaskType,
  options: RunStepOptions<TaskType>,
) {
  const stepList = await loadStepsForTask(task, options);

  await runStepsInStage(stepList.pre, options);
  await runStepsInStage(stepList.default, options);
  await runStepsInStage(stepList.post, options);
}

interface StepNeedWithStep extends StepNeed {
  step: AnyStep;
}

async function runStepsInStage(
  steps: AnyStep[],
  {ui, filter}: RunStepOptions<any>,
) {
  const stepMetadata = new Map<
    AnyStep,
    {
      skipped: boolean;
      completed: boolean;
      inclusion: InclusionResult;
      needs: StepNeedWithStep[];
    }
  >();
  const workspaceSteps = new Set(
    steps.filter(
      (step): step is WorkspaceStep => step.target.kind === 'workspace',
    ),
  );

  const queuedSteps = [...steps];

  for (const step of steps) {
    const inclusion = filter.includeStep(step);

    if (!inclusion.included) {
      stepMetadata.set(step, {
        skipped: true,
        completed: false,
        inclusion,
        needs: [],
      });
      continue;
    }

    const projectInclusion: InclusionResult =
      step.target.kind === 'workspace'
        ? filter.includeWorkspace()
        : filter.includeProject(step.target);

    if (!projectInclusion.included) {
      stepMetadata.set(step, {
        skipped: true,
        completed: false,
        inclusion: projectInclusion,
        needs: [],
      });
      continue;
    }

    const needs: StepNeedWithStep[] = [];

    if (step.needs) {
      const isWorkspaceStep = workspaceSteps.has(step as any);
      // Workspace steps can only depend on other workspace steps, project
      // steps can depend on either project or workspace steps
      const checkSteps = isWorkspaceStep ? workspaceSteps : steps;

      for (const checkStep of checkSteps) {
        // Can’t depend on yourself
        if (checkStep === step) continue;

        const needResult = step.needs(checkStep as any);
        const stepNeed: typeof needs[number] =
          typeof needResult === 'boolean'
            ? {step: checkStep, need: needResult}
            : {...needResult, step: checkStep};

        if (stepNeed.need) needs.push(stepNeed);
      }
    }

    stepMetadata.set(step, {
      skipped: false,
      completed: false,
      inclusion,
      needs,
    });
  }

  await runNextStep();

  async function runNextStep() {
    for (const [index, step] of queuedSteps.entries()) {
      const metadata = stepMetadata.get(step)!;
      const {skipped, inclusion, needs} = metadata;

      if (skipped) {
        ui.log(
          `Skipping step: ${step.label} (${step.name}, reason: ${
            inclusion.reason === ExcludedReason.Skipped
              ? 'skipped'
              : 'other step marked as only'
          })`,
        );

        queuedSteps.splice(index, 1);
        await runNextStep();
        return;
      }

      if (
        needs.every(({step, need, allowSkip = false}) => {
          if (!need) return true;

          const metadata = stepMetadata.get(step)!;

          if (metadata.skipped) return allowSkip;

          return metadata.completed;
        })
      ) {
        await runStep(step);

        metadata.completed = true;
        queuedSteps.splice(index, 1);
        await runNextStep();
        return;
      }
    }

    if (queuedSteps.length !== 0) {
      throw new Error(
        `Could not complete steps: ${JSON.stringify(queuedSteps)}`,
      );
    }
  }

  async function runStep(step: AnyStep) {
    ui.log(`Running step: ${step.label} (${step.name})`);
    await step.run(createStepRunner({ui}));
  }
}

interface BuildProjectTaskInternal<ProjectType extends Project = Project>
  extends Omit<BuildProjectTask<ProjectType>, 'run'> {
  run: (
    plugin: AnyPlugin,
    ...args: Parameters<BuildProjectTask<ProjectType>['run']>
  ) => ReturnType<BuildProjectTask<ProjectType>['run']>;
}

async function loadStepsForTask<TaskType extends Task = Task>(
  task: TaskType,
  {
    plugins,
    options,
    workspace,
    internal,
    coreHooksForProject,
    coreHooksForWorkspace,
  }: RunStepOptions<TaskType>,
): Promise<StepList> {
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
  const taskForProject = new Map<Project, BuildProjectTaskInternal<any>>();
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
  const projectTaskHandlersForWorkspace: {
    plugin: WorkspacePlugin;
    handler(task: BuildProjectTask<any>): void;
  }[] = [];

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
          const newStepOrSteps = await adder(
            (step) => ({
              stage: 'default',
              ...step,
              target: workspace,
              source: plugin,
            }),
            {
              configuration: loadConfigurationForWorkspace,
              projectConfiguration: loadConfigurationForProject,
            },
          );

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
        projectTaskHandlersForWorkspace.push({plugin, handler});
      },
    });
  }

  for (const {plugin, handler} of projectTaskHandlersForWorkspace) {
    for (const project of workspace.projects) {
      handler(getTaskForProjectAndPlugin(project, plugin));
    }
  }

  for (const project of workspace.projects) {
    const projectPlugins = plugins.for(project);

    for (const plugin of projectPlugins) {
      plugin[pluginMethod]?.(
        getTaskForProjectAndPlugin<any>(project, plugin as any),
      );
    }
  }

  const workspaceSteps: WorkspaceStep[] = [];

  for (const stepAdder of stepAddersForWorkspace) {
    await stepAdder(workspaceSteps);
  }

  const projectStepsByProject = await Promise.all(
    workspace.projects.map(async (project) => {
      const stepAdders = stepAddersForProject.get(project) ?? [];
      const steps: ProjectStep<any>[] = [];

      for (const stepAdder of stepAdders) {
        await stepAdder(steps);
      }

      return steps;
    }),
  );

  const stepList: StepList = {pre: [], default: [], post: []};

  for (const workspaceStep of workspaceSteps) {
    stepList[workspaceStep.stage].push(workspaceStep);
  }

  for (const projectSteps of projectStepsByProject) {
    for (const projectStep of projectSteps) {
      stepList[projectStep.stage].push(projectStep);
    }
  }

  return stepList;

  function getTaskForProjectAndPlugin<ProjectType extends Project = Project>(
    project: ProjectType,
    plugin: AnyPlugin,
  ): BuildProjectTask<ProjectType> {
    const internalTask = getInternalTaskForProject(project);

    return {
      ...internalTask,
      run(...args) {
        return (internalTask.run as any)(plugin, ...args);
      },
    };
  }

  function getInternalTaskForProject<ProjectType extends Project = Project>(
    project: ProjectType,
  ) {
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

    const task: BuildProjectTaskInternal<ProjectType> = {
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
      run(plugin, adder) {
        stepAdders.push(async (steps) => {
          const newStepOrSteps = await adder(
            (step) => ({
              stage: 'default',
              ...step,
              target: project,
              source: plugin as any,
            }),
            {
              configuration(options) {
                return loadConfigurationForProject(project, options);
              },
            },
          );

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

const promiseExec = promisify(childExec);

const exec: BaseStepRunner['exec'] = (
  command,
  args,
  {fromNodeModules, ...options} = {},
) => {
  const normalizedCommand = fromNodeModules
    ? join(
        binDirectoryForModule(
          fromNodeModules === true
            ? process.cwd()
            : dirname(fileURLToPath(fromNodeModules)),
        ),
        command,
      )
    : command;

  const execPromise = promiseExec(
    [normalizedCommand, ...(args ?? [])].join(' '),
    options,
  );

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
      return value === true ? key : `${key}: ${JSON.stringify(value)}`;
    })
    .join(',');
}

function binDirectoryForModule(cwd: string) {
  const result = execSync('npm bin', {cwd});
  return result.toString().trim();
}
