/* eslint no-warning-comments: off */

import type {App, Service, Project, Workspace, TargetRuntime} from './model';
import type {ProjectStep, WorkspaceStep} from './steps';
import type {Environment, ValueOrPromise} from './types';

export const NONE = Symbol.for('SewingKit.None');
type None = typeof NONE;

export type SequenceHookArguments<
  Arg1 = None,
  Arg2 = None,
  Arg3 = None
> = Arg1 extends None
  ? []
  : Arg2 extends None
  ? [Arg1]
  : Arg3 extends None
  ? [Arg1, Arg2]
  : [Arg1, Arg2, Arg3];

/**
 * A `SequenceHook` accepts at least one argument. It is called with
 * some set of arguments, and each function that hooks in is called
 * with those arguments in sequence (they can do so asynchronously).
 */
export interface SequenceHook<Args extends any[] = []> {
  (hook: (...args: Args) => void | Promise<void>): void;
  run(...args: Args): Promise<void>;
}

export type WaterfallHookArguments<
  Value,
  Arg1 = None,
  Arg2 = None,
  Arg3 = None
> = Arg1 extends None
  ? [Value]
  : Arg2 extends None
  ? [Value, Arg1]
  : Arg3 extends None
  ? [Value, Arg1, Arg2]
  : [Value, Arg1, Arg2, Arg3];

/**
 * A `WaterfallHook` accepts at least one argument. The first argument
 * is special: it is the result of calling previous waterfall hooks
 * on an initial value (you can start this process by calling `#run()`).
 * Each function that hooks into a `WaterfallHook` must return an
 * updated version of the first argument, which will then be passed
 * to subsequent hooks, and can do so asynchronously.
 */
export interface WaterfallHook<Value = unknown, Args extends any[] = []> {
  (hook: (value: Value, ...args: Args) => Value | Promise<Value>): void;
  run(value: Value, ...args: Args): Promise<Value>;
}

export function createSequenceHook<Args extends any[] = []>() {
  const hooks: ((...args: Args) => void | Promise<void>)[] = [];

  const sequenceHook: SequenceHook<Args> = (hook) => {
    hooks.push(hook);
  };

  sequenceHook.run = async (...args) => {
    for (const hook of hooks) {
      await hook(...args);
    }
  };

  return sequenceHook;
}

export function createWaterfallHook<
  Value = unknown,
  Args extends any[] = []
>() {
  const hooks: ((value: Value, ...args: Args) => Value | Promise<Value>)[] = [];

  const waterfallHook: WaterfallHook<Value, Args> = (hook) => {
    hooks.push(hook);
  };

  waterfallHook.run = async (initial, ...args) => {
    let result: Value = initial;

    for (const hook of hooks) {
      result = await (hook as any)(result, ...args);
    }

    return result;
  };

  return waterfallHook;
}

// === === === ===
// UTILITIES
// === === === ===

/**
 * Represents the resolved custom hooks, including the fact that they
 * are no longer mutable (after the creation phase) and that they are
 * always optional, as there is no guarantee the plugin that added the
 * type is actually included in a given project.
 */
export type ResolvedHooks<T> = {
  readonly [K in keyof T]?: T[K];
};

/**
 * Represents the resolved custom options, including the fact that they
 * are no longer mutable (after the creation phase) and that they are
 * always optional.
 */
export type ResolvedOptions<T> = {
  readonly [K in keyof T]?: T[K];
};

// TODO
export interface HookAdderHelper {
  sequence<Args extends any[] = []>(): SequenceHook<Args>;
  waterfall<Value, Args extends any[] = []>(): WaterfallHook<Value, Args>;
}

// TODO
export interface HookAdder<AllowedHooks> {
  <T = Partial<AllowedHooks>>(adder: (hooks: HookAdderHelper) => T): void;
}

// TODO
export interface ProjectStepAdderContext<
  ProjectConfigurationHooks,
  ProjectOptions
> {
  configuration(options?: ProjectOptions): Promise<ProjectConfigurationHooks>;
}

export interface ProjectStepAdder<
  ProjectType extends Project,
  ProjectConfigurationHooks,
  ProjectOptions
> {
  (
    adder: (
      step: (step: ProjectStep<ProjectType>) => ProjectStep<ProjectType>,
      context: ProjectStepAdderContext<
        ProjectConfigurationHooks,
        ProjectOptions
      >,
    ) => ValueOrPromise<
      | ProjectStep<ProjectType>
      | ProjectStep<ProjectType>[]
      | null
      | undefined
      | false
    >,
  ): void;
}

// TODO
export interface WorkspaceStepAdderContext<
  WorkspaceConfigurationHooks,
  WorkspaceOptions
> {
  configuration(
    options?: WorkspaceOptions,
  ): Promise<WorkspaceConfigurationHooks>;
}

export interface WorkspaceStepAdder<
  WorkspaceConfigurationHooks,
  WorkspaceOptions
> {
  (
    adder: (
      step: (step: WorkspaceStep) => WorkspaceStep,
      context: WorkspaceStepAdderContext<
        WorkspaceConfigurationHooks,
        WorkspaceOptions
      >,
    ) => ValueOrPromise<
      WorkspaceStep | WorkspaceStep[] | null | undefined | false
    >,
  ): void;
}

// === === === ===
// BUILD
// === === === ===

/**
 * Options that are available to configuration hooks for building any
 * code project.
 */
export interface BuildProjectOptions {}

/**
 * Options that are available to configuration hooks for building applications.
 */
export interface BuildAppOptions extends BuildProjectOptions {}

/**
 * Options that are available to configuration hooks for building backend services.
 */
export interface BuildServiceOptions extends BuildProjectOptions {}

/**
 * Options that are available to configuration hooks for building packages.
 */
export interface BuildPackageOptions extends BuildProjectOptions {}

/**
 * Selects the build options that match the provided project type.
 */
export type BuildOptionsForProject<
  ProjectType extends Project
> = ProjectType extends App
  ? BuildAppOptions
  : ProjectType extends Service
  ? BuildServiceOptions
  : BuildPackageOptions;

/**
 * Options that are available to configuration hooks for building
 * code related to your overall workspace.
 */
export interface BuildWorkspaceOptions {}

/**
 * Hooks provided by sewing-kit for building any code project.
 */
export interface BuildProjectConfigurationCoreHooks {}

/**
 * Configuration hooks for building any code project.
 */
export interface BuildProjectConfigurationHooks {}

/**
 * Configuration hooks for building applications.
 */
export interface BuildAppConfigurationHooks
  extends BuildProjectConfigurationHooks {}

/**
 * Configuration hooks for building backend services.
 */
export interface BuildServiceConfigurationHooks
  extends BuildProjectConfigurationHooks {}

/**
 * Configuration hooks for building packages.
 */
export interface BuildPackageConfigurationHooks
  extends BuildProjectConfigurationHooks {}

/**
 * Selects the build configuration hooks that match the provided
 * project type.
 */
export type BuildConfigurationHooksForProject<
  ProjectType extends Project
> = ProjectType extends App
  ? BuildAppConfigurationHooks
  : ProjectType extends Service
  ? BuildServiceConfigurationHooks
  : BuildPackageConfigurationHooks;

/**
 * The full set of resolved build hooks for a single project of the
 * provided type. This includes all the core hooks provided automatically,
 * and any hooks added by plugins during the `hooks` phase of running this
 * task. All plugins added by hooks are marked as optional in this type
 * because the plugin that added the type may not have been used in this
 * project.
 */
export type ResolvedBuildProjectConfigurationHooks<
  ProjectType extends Project = Project
> = ResolvedHooks<BuildConfigurationHooksForProject<ProjectType>> &
  BuildProjectConfigurationCoreHooks;

/**
 * Hooks provided by sewing-kit for building the entire workspace.
 */
export interface BuildWorkspaceConfigurationCoreHooks {}

/**
 * Configuration hooks for building the entire workspace.
 */
export interface BuildWorkspaceConfigurationHooks {}

/**
 * The full set of resolved build hooks for the overall workspace. This
 * includes all the core hooks provided automatically, and any hooks added
 * by plugins during the `hooks` phase of running this task. All plugins
 * added by hooks are marked as optional in this type because the plugin
 * that added the type may not have been used in this project.
 */
export type ResolvedBuildWorkspaceConfigurationHooks = ResolvedHooks<
  BuildWorkspaceConfigurationHooks
> &
  BuildWorkspaceConfigurationCoreHooks;

/**
 * Additional context provided to the configuration hooks for
 * building an individual project.
 */
export interface BuildProjectConfigurationContext<ProjectType extends Project> {
  /**
   * The project being built.
   */
  readonly project: ProjectType;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The runtime that this project will execute in. By default, the runtime
   * is chosen based on the product type (apps target the browser, services
   * target node, and packages target all environments). You should read
   * the runtime from this field instead of inferring it from the project
   * yourself, as it is possible for consumers to generate configuration for
   * a “variant” of the project targeting a non-standard environment (e.g.,
   * an app being built for a node SSR runtime).
   */
  readonly target: TargetRuntime;

  /**
   * The options for generating this build configuration. Configuration
   * hooks can run multiple times with different sets of options, but each
   * unique set of options will only ever be configured once. You can add
   * additional options by augmenting the `BuildProjectOptions` object
   * in `@quilted/sewing-kit` (or the project-specific versions of that
   * type).
   */
  readonly options: Readonly<BuildOptionsForProject<ProjectType>>;
}

/**
 * Additional context provided to the configuration hooks for
 * developing an individual project.
 */
export interface BuildWorkspaceConfigurationContext {
  /**
   * The workspace being built.
   */
  readonly workspace: Workspace;

  /**
   * The runtime that tasks will execute in. Defaults to Node.
   */
  readonly target: TargetRuntime;

  /**
   * The options for generating this build configuration. Configuration
   * hooks can run multiple times with different sets of options, but each
   * unique set of options will only ever be configured once. You can add
   * additional options by augmenting the `BuildWorkspaceOptions` object.
   */
  readonly options: Readonly<BuildWorkspaceOptions>;
}

/**
 * The top-level options that can be passed when running the develop task.
 */
export interface BuildTaskOptions {
  /**
   * The environment the code will be executed in. Defaults to `Environment.Production`.
   */
  readonly env: Environment;
  /**
   * Controls whether tools that are capable of caching build outputs will
   * do so. Defaults to `true`.
   */
  readonly cache: boolean;
  /**
   * Controls whether sourcemaps are generated in tools that support them.
   * Defaults to `true`.
   */
  readonly sourceMaps: boolean;
}

/**
 * The hooks and additional metadata for running the build command on
 * a single project.
 */
export interface BuildProjectTask<ProjectType extends Project = Project> {
  /**
   * The project being built.
   */
  readonly project: ProjectType;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: BuildTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `BuildProjectConfigurationHooks`
   * (or the project-specific variant you want to add hooks for) in
   * `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<BuildConfigurationHooksForProject<ProjectType>>;

  /**
   * Provide additional configuration for each build target. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `BuildProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: SequenceHook<
    [
      ResolvedBuildProjectConfigurationHooks<ProjectType>,
      BuildProjectConfigurationContext<ProjectType>,
    ]
  >;

  /**
   * Provide additional steps to run when building this project. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: ProjectStepAdder<
    ProjectType,
    ResolvedBuildProjectConfigurationHooks<ProjectType>,
    BuildOptionsForProject<ProjectType>
  >;
}

/**
 * The hooks and additional metadata for running the build command on
 * the overall workspace.
 */
export interface BuildWorkspaceTask {
  /**
   * The workspace being built.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: BuildTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `BuildWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<BuildWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for each build target. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `BuildWorkspaceConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: SequenceHook<
    [
      ResolvedBuildWorkspaceConfigurationHooks,
      BuildWorkspaceConfigurationContext,
    ]
  >;

  /**
   * Provide additional steps to run when building this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<
    ResolvedBuildWorkspaceConfigurationHooks,
    BuildWorkspaceOptions
  >;
}

// === === === ===
// DEVELOP
// === === === ===

/**
 * Options that are available to configuration hooks for developing any
 * code project.
 */
export interface DevelopProjectOptions {}

/**
 * Options that are available to configuration hooks for developing applications.
 */
export interface DevelopAppOptions extends DevelopProjectOptions {}

/**
 * Options that are available to configuration hooks for developing projects.
 */
export interface DevelopServiceOptions extends DevelopProjectOptions {}

/**
 * Options that are available to configuration hooks for developing backend services.
 */
export interface DevelopPackageOptions extends DevelopProjectOptions {}

/**
 * Selects the development options that match the provided project type.
 */
export type DevelopOptionsForProject<
  ProjectType extends Project
> = ProjectType extends App
  ? DevelopAppOptions
  : ProjectType extends Service
  ? DevelopServiceOptions
  : DevelopPackageOptions;

/**
 * Options that are available to configuration hooks for developing
 * code related to your overall workspace.
 */
export interface DevelopWorkspaceOptions {}

/**
 * Hooks provided by sewing-kit for developing any code project.
 */
export interface DevelopProjectConfigurationCoreHooks {}

/**
 * Configuration hooks for developing any code project.
 */
export interface DevelopProjectConfigurationHooks {}

/**
 * Configuration hooks for developing applications.
 */
export interface DevelopAppConfigurationHooks
  extends DevelopProjectConfigurationHooks {}

/**
 * Configuration hooks for developing backend services.
 */
export interface DevelopServiceConfigurationHooks
  extends DevelopProjectConfigurationHooks {}

/**
 * Configuration hooks for developing packages.
 */
export interface DevelopPackageConfigurationHooks
  extends DevelopProjectConfigurationHooks {}

/**
 * Selects the development configuration hooks that match the provided
 * project type.
 */
export type DevelopConfigurationHooksForProject<
  ProjectType extends Project
> = ProjectType extends App
  ? DevelopAppConfigurationHooks
  : ProjectType extends Service
  ? DevelopServiceConfigurationHooks
  : DevelopPackageConfigurationHooks;

/**
 * The full set of resolved development hooks for a single project of the
 * provided type. This includes all the core hooks provided automatically,
 * and any hooks added by plugins during the `hooks` phase of running this
 * task. All plugins added by hooks are marked as optional in this type
 * because the plugin that added the type may not have been used in this
 * project.
 */
export type ResolvedDevelopProjectConfigurationHooks<
  ProjectType extends Project = Project
> = ResolvedHooks<DevelopConfigurationHooksForProject<ProjectType>> &
  DevelopProjectConfigurationCoreHooks;

/**
 * Hooks provided by sewing-kit for developing the entire workspace.
 */
export interface DevelopWorkspaceConfigurationCoreHooks {}

/**
 * Configuration hooks for developing the entire workspace.
 */
export interface DevelopWorkspaceConfigurationHooks {}

/**
 * The full set of resolved development hooks for the overall workspace. This
 * includes all the core hooks provided automatically, and any hooks added
 * by plugins during the `hooks` phase of running this task. All plugins
 * added by hooks are marked as optional in this type because the plugin
 * that added the type may not have been used in this project.
 */
export type ResolvedDevelopWorkspaceConfigurationHooks = ResolvedHooks<
  DevelopWorkspaceConfigurationHooks
> &
  DevelopWorkspaceConfigurationCoreHooks;

/**
 * Additional context provided to the configuration hooks for
 * developing an individual project.
 */
export interface DevelopProjectConfigurationContext<
  ProjectType extends Project
> {
  /**
   * The project being developed.
   */
  readonly project: ProjectType;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The runtime that this project will execute in. By default, the runtime
   * is chosen based on the product type (apps target the browser, services
   * target node, and packages target all environments). You should read
   * the runtime from this field instead of inferring it from the project
   * yourself, as it is possible for consumers to generate configuration for
   * a “variant” of the project targeting a non-standard environment (e.g.,
   * an app being built for a node SSR runtime).
   */
  readonly target: TargetRuntime;

  /**
   * The options for generating this development configuration. Configuration
   * hooks can run multiple times with different sets of options, but each
   * unique set of options will only ever be configured once. You can add
   * additional options by augmenting the `DevelopProjectOptions` object
   * in `@quilted/sewing-kit` (or the project-specific versions of that
   * type).
   */
  readonly options: Readonly<DevelopOptionsForProject<ProjectType>>;
}

/**
 * Additional context provided to the configuration hooks for
 * developing the overall workspace.
 */
export interface DevelopWorkspaceConfigurationContext {
  /**
   * The workspace being developed.
   */
  readonly workspace: Workspace;

  /**
   * The runtime that tasks will execute in. Defaults to Node.
   */
  readonly target: TargetRuntime;

  /**
   * The options for generating this build configuration. Configuration
   * hooks can run multiple times with different sets of options, but each
   * unique set of options will only ever be configured once. You can add
   * additional options by augmenting the `BuildWorkspaceOptions` object.
   */
  readonly options: Readonly<DevelopWorkspaceOptions>;
}

/**
 * The top-level options that can be passed when running the develop task.
 */
export interface DevelopTaskOptions {
  /**
   * Controls whether sourcemaps are generated in tools that support them.
   * Defaults to `false`.
   */
  readonly sourceMaps: boolean;
}

/**
 * The hooks and additional metadata for running the develop command on
 * a single project.
 */
export interface DevelopProjectTask<ProjectType extends Project = Project> {
  /**
   * The project being developed.
   */
  readonly project: ProjectType;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: DevelopTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `DevelopProjectConfigurationHooks`
   * (or the project-specific variant you want to add hooks for) in
   * `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<DevelopConfigurationHooksForProject<ProjectType>>;

  /**
   * Provide additional configuration for each development target. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `DevelopProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: SequenceHook<
    [
      ResolvedDevelopProjectConfigurationHooks<ProjectType>,
      DevelopProjectConfigurationContext<ProjectType>,
    ]
  >;

  /**
   * Provide additional steps to run when developing this project. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: ProjectStepAdder<
    ProjectType,
    ResolvedDevelopProjectConfigurationHooks<ProjectType>,
    DevelopOptionsForProject<ProjectType>
  >;
}

/**
 * The hooks and additional metadata for running the build command on
 * the overall workspace.
 */
export interface DevelopWorkspaceTask {
  /**
   * The workspace being developed.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: BuildTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `DevelopWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<BuildWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for each development target. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `DevelopWorkspaceConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: SequenceHook<
    [
      ResolvedBuildWorkspaceConfigurationHooks,
      BuildWorkspaceConfigurationContext,
    ]
  >;

  /**
   * Provide additional steps to run when building this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<
    ResolvedBuildWorkspaceConfigurationHooks,
    BuildWorkspaceOptions
  >;
}
