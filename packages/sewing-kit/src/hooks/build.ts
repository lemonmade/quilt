import type {Environment} from '../types';
import type {Project, App, Service, Workspace, TargetRuntime} from '../model';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  SequenceHook,
  WaterfallHook,
  WorkspaceStepAdder,
} from './shared';

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
}

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
   * Provide additional configuration for building the project. Custom
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
   * Provide additional configuration for building the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `BuildWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
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
