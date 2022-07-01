import type {ValueOrPromise} from '../types';
import type {Project, Workspace, TargetRuntime} from '../model';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  ResolvedOptions,
  WaterfallHook,
  WaterfallHookWithDefault,
  ConfigurationCollector,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared';

/**
 * Options that are available to configuration hooks for developing any
 * code project.
 */
export interface DevelopProjectOptions {}

/**
 * Options that are available to configuration hooks for developing
 * code related to your overall workspace.
 */
export interface DevelopWorkspaceOptions {}

/**
 * Hooks for developing any code project.
 */
export interface DevelopProjectConfigurationCoreHooks {
  /**
   * Extensions to use for any bare module specifiers included in your
   * codebase.
   */
  readonly extensions: WaterfallHook<string[]>;

  /**
   * The runtimes of the development environment.
   */
  readonly runtime: WaterfallHookWithDefault<TargetRuntime>;
}

/**
 * Configuration hooks for developing any code project.
 */
export interface DevelopProjectConfigurationHooks {}

/**
 * The full set of resolved develop hooks for a single project. This includes
 * all the core hooks provided automatically, and any hooks added by plugins
 * during the `hooks` phase of running this task. All plugins added by hooks
 * are marked as optional in this type because the plugin that added the type
 * may not have been used in this project.
 */
export type ResolvedDevelopProjectConfigurationHooks =
  ResolvedHooks<DevelopProjectConfigurationHooks> &
    DevelopProjectConfigurationCoreHooks;

/**
 * Hooks for developing the entire workspace.
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
 * The top-level options that can be passed when running the develop task.
 */
export interface DevelopTaskOptions {
  /**
   * Whether to enable debug modes for tools that support it. This may include
   * more verbose logging, different error behaviors, enabling interactive debugger
   * hooks, and other configuration changes.
   */
  readonly debug: boolean;
}

/**
 * The hooks and additional metadata for running the develop command on
 * a single project.
 */
export interface DevelopProjectTask {
  /**
   * The project being developed.
   */
  readonly project: Project;

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
  readonly hooks: HookAdder<DevelopProjectConfigurationHooks>;

  /**
   * Provide additional configuration for developing the project. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `DevelopProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedDevelopProjectConfigurationHooks,
    ResolvedOptions<DevelopProjectOptions>
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
    ResolvedDevelopProjectConfigurationHooks,
    DevelopProjectOptions
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
    project: ProjectType,
    options?: DevelopProjectOptions,
  ): Promise<ResolvedDevelopProjectConfigurationHooks>;
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
  readonly configure: ConfigurationCollector<
    ResolvedDevelopWorkspaceConfigurationHooks,
    ResolvedOptions<DevelopWorkspaceOptions>
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
  project(handler: (task: DevelopProjectTask) => ValueOrPromise<void>): void;
}
