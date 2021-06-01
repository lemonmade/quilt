import type {Project, App, Service, Workspace, TargetRuntime} from '../model';
import type {ValueOrPromise} from '../types';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  SequenceHook,
  WaterfallHook,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared';

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
export type DevelopOptionsForProject<ProjectType extends Project> =
  ProjectType extends App
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
export interface DevelopProjectConfigurationCoreHooks {
  /**
   * Extensions to use for any bare module specifiers included in your
   * codebase.
   */
  readonly extensions: WaterfallHook<string[]>;
}

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
export type DevelopConfigurationHooksForProject<ProjectType extends Project> =
  ProjectType extends App
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
  ProjectType extends Project = Project,
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
export type ResolvedDevelopWorkspaceConfigurationHooks =
  ResolvedHooks<DevelopWorkspaceConfigurationHooks> &
    DevelopWorkspaceConfigurationCoreHooks;

/**
 * Additional context provided to the configuration hooks for
 * developing an individual project.
 */
export interface DevelopProjectConfigurationContext<
  ProjectType extends Project,
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
   * The options for generating this develop configuration. Configuration
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
   * Provide additional configuration for developing the project. Custom
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
 * The full context available to workspace steps for the `develop`
 * task, including the ability to access the develop configuration
 * for individual projects.
 */
export interface DevelopWorkspaceStepAdderContext
  extends WorkspaceStepAdderContext<
    ResolvedDevelopWorkspaceConfigurationHooks,
    DevelopWorkspaceOptions
  > {
  /**
   * Fetches the development configuration for the provided project. Like
   * the `configuration()` function available to project-level steps,
   * you can optionally pass development options for the provided project,
   * and the configuration hooks will be generated separately for
   * every unique set of options.
   */
  projectConfiguration<ProjectType extends Project = Project>(
    options?: DevelopOptionsForProject<ProjectType>,
  ): Promise<ResolvedDevelopProjectConfigurationHooks<ProjectType>>;
}

/**
 * The hooks and additional metadata for running the develop command on
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
  readonly options: DevelopTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `DevelopWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<DevelopWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for developing the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `DevelopWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
   */
  readonly configure: SequenceHook<
    [
      ResolvedDevelopWorkspaceConfigurationHooks,
      DevelopWorkspaceConfigurationContext,
    ]
  >;

  /**
   * Provide additional steps to run when developing this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<DevelopWorkspaceStepAdderContext>;

  /**
   * Gives you access to each project in this workspace. You should pass this
   * function a function that will be called with the same arguments as the `develop`
   * hook of a project plugin. You can use this hook to add configuration or
   * steps to multiple projects in the workspace.
   */
  project<ProjectType extends Project = Project>(
    handler: (task: DevelopProjectTask<ProjectType>) => ValueOrPromise<void>,
  ): void;
}
