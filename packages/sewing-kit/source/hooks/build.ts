import type {Environment, ValueOrPromise} from '../types.ts';
import type {Project, Workspace} from '../model.ts';
import type {Runtime} from '../runtime.ts';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  ResolvedOptions,
  WaterfallHook,
  ConfigurationCollector,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared.ts';

/**
 * Options that are available to configuration hooks for building any
 * code project.
 */
export interface BuildProjectOptions {}

/**
 * Options that are available to configuration hooks for building
 * code related to your overall workspace.
 */
export interface BuildWorkspaceOptions {}

/**
 * Hooks for building any code project.
 */
export interface BuildProjectConfigurationCoreHooks {
  /**
   * The root directory in which to output build artifacts for this
   * project.
   */
  readonly outputDirectory: WaterfallHook<string>;

  /**
   * Extensions to use for any bare module specifiers included in your
   * codebase.
   */
  readonly extensions: WaterfallHook<string[]>;

  /**
   * The runtimes that this build will execute in
   */
  readonly runtimes: WaterfallHook<Runtime[]>;
}

/**
 * Configuration hooks for building any code project.
 */
export interface BuildProjectConfigurationHooks {}

/**
 * The full set of resolved build hooks for a single project. This includes
 * all the core hooks provided automatically, and any hooks added by plugins
 * during the `hooks` phase of running this task. All plugins added by hooks
 * are marked as optional in this type because the plugin that added the type
 * may not have been used in this project.
 */
export type ResolvedBuildProjectConfigurationHooks =
  ResolvedHooks<BuildProjectConfigurationHooks> &
    BuildProjectConfigurationCoreHooks;

/**
 * Hooks for building the entire workspace.
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
export type ResolvedBuildWorkspaceConfigurationHooks =
  ResolvedHooks<BuildWorkspaceConfigurationHooks> &
    BuildWorkspaceConfigurationCoreHooks;

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
}

/**
 * The hooks and additional metadata for running the build command on
 * a single project.
 */
export interface BuildProjectTask {
  /**
   * The project being built.
   */
  readonly project: Project;

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
  readonly hooks: HookAdder<BuildProjectConfigurationHooks>;

  /**
   * Provide additional configuration for building the project. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `BuildProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedBuildProjectConfigurationHooks,
    ResolvedOptions<BuildProjectOptions>
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
    ResolvedBuildProjectConfigurationHooks,
    BuildProjectOptions
  >;
}

/**
 * The full context available to workspace steps for the `build`
 * task, including the ability to access the build configuration
 * for individual projects.
 */
export interface BuildWorkspaceStepAdderContext
  extends WorkspaceStepAdderContext<
    ResolvedBuildWorkspaceConfigurationHooks,
    BuildWorkspaceOptions
  > {
  /**
   * Fetches the build configuration for the provided project. Like
   * the `configuration()` function available to project-level steps,
   * you can optionally pass build options for the provided project,
   * and the configuration hooks will be generated separately for
   * every unique set of options.
   */
  projectConfiguration<ProjectType extends Project = Project>(
    project: ProjectType,
    options?: BuildProjectOptions,
  ): Promise<ResolvedBuildProjectConfigurationHooks>;
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
   * Provide additional configuration for building the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `BuildWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedBuildWorkspaceConfigurationHooks,
    ResolvedOptions<BuildWorkspaceOptions>
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
  readonly run: WorkspaceStepAdder<BuildWorkspaceStepAdderContext>;

  /**
   * Gives you access to each project in this workspace. You should pass this
   * function a function that will be called with the same arguments as the `build`
   * hook of a project plugin. You can use this hook to add configuration or
   * steps to multiple projects in the workspace.
   */
  project(handler: (task: BuildProjectTask) => ValueOrPromise<void>): void;
}
