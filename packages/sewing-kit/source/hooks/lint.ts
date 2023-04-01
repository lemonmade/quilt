import type {ValueOrPromise} from '../types.ts';
import type {Project, Workspace} from '../model.ts';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  ResolvedOptions,
  ConfigurationCollector,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared.ts';

/**
 * Options that are available to configuration hooks for linting any
 * code project.
 */
export interface LintProjectOptions {}

/**
 * Options that are available to configuration hooks for linting
 * code related to your overall workspace.
 */
export interface LintWorkspaceOptions {}

/**
 * Hooks for linting any code project.
 */
export interface LintProjectConfigurationCoreHooks {}

/**
 * Configuration hooks for linting any code project.
 */
export interface LintProjectConfigurationHooks {}

/**
 * The full set of resolved lint hooks for a single project. This includes
 * all the core hooks provided automatically, and any hooks added by plugins
 * during the `hooks` phase of running this task. All plugins added by hooks
 * are marked as optional in this type because the plugin that added the type
 * may not have been used in this project.
 */
export type ResolvedLintProjectConfigurationHooks =
  ResolvedHooks<LintProjectConfigurationHooks> &
    LintProjectConfigurationCoreHooks;

/**
 * Hooks for linting the entire workspace.
 */
export interface LintWorkspaceConfigurationCoreHooks {}

/**
 * Configuration hooks for linting the entire workspace.
 */
export interface LintWorkspaceConfigurationHooks {}

/**
 * The full set of resolved linting hooks for the overall workspace. This
 * includes all the core hooks provided automatically, and any hooks added
 * by plugins during the `hooks` phase of running this task. All plugins
 * added by hooks are marked as optional in this type because the plugin
 * that added the type may not have been used in this project.
 */
export type ResolvedLintWorkspaceConfigurationHooks =
  ResolvedHooks<LintWorkspaceConfigurationHooks> &
    LintWorkspaceConfigurationCoreHooks;

/**
 * The top-level options that can be passed when running the lint task.
 */
export interface LintTaskOptions {
  /**
   * Whether lint errors should be fixed, where possible.
   */
  readonly fix: boolean;
}

/**
 * The hooks and additional metadata for running the lint command on
 * a single project.
 */
export interface LintProjectTask {
  /**
   * The project being linted.
   */
  readonly project: Project;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: LintTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `LintProjectConfigurationHooks`
   * (or the project-specific variant you want to add hooks for) in
   * `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<LintProjectConfigurationHooks>;

  /**
   * Provide additional configuration for linting the project. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `LintProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedLintProjectConfigurationHooks,
    ResolvedOptions<LintProjectOptions>
  >;

  /**
   * Provide additional steps to run when linting this project. This
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
    ResolvedLintProjectConfigurationHooks,
    LintProjectOptions
  >;
}

/**
 * The full context available to workspace steps for the `lint`
 * task, including the ability to access the lint configuration
 * for individual projects.
 */
export interface LintWorkspaceStepAdderContext
  extends WorkspaceStepAdderContext<
    ResolvedLintWorkspaceConfigurationHooks,
    LintWorkspaceOptions
  > {
  /**
   * Fetches the lint configuration for the provided project. Like
   * the `configuration()` function available to project-level steps,
   * you can optionally pass lint options for the provided project,
   * and the configuration hooks will be generated separately for
   * every unique set of options.
   */
  projectConfiguration<ProjectType extends Project = Project>(
    project: ProjectType,
    options?: LintProjectOptions,
  ): Promise<ResolvedLintProjectConfigurationHooks>;
}

/**
 * The hooks and additional metadata for running the lint command on
 * the overall workspace.
 */
export interface LintWorkspaceTask {
  /**
   * The workspace being linted.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: LintTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `LintWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<LintWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for linting the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `LintWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedLintWorkspaceConfigurationHooks,
    ResolvedOptions<LintWorkspaceOptions>
  >;

  /**
   * Provide additional steps to run when linting this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<LintWorkspaceStepAdderContext>;

  /**
   * Gives you access to each project in this workspace. You should pass this
   * function a function that will be called with the same arguments as the `lint`
   * hook of a project plugin. You can use this hook to add configuration or
   * steps to multiple projects in the workspace.
   */
  project(handler: (task: LintProjectTask) => ValueOrPromise<void>): void;
}
