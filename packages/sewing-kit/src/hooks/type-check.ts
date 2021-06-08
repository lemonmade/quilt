import type {Project, App, Service, Workspace} from '../model';
import type {ValueOrPromise} from '../types';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  ResolvedOptions,
  ConfigurationCollector,
  SewingKitInternalContext,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared';

/**
 * Options that are available to configuration hooks for type checking any
 * code project.
 */
export interface TypeCheckProjectOptions {}

/**
 * Options that are available to configuration hooks for type checking applications.
 */
export interface TypeCheckAppOptions extends TypeCheckProjectOptions {}

/**
 * Options that are available to configuration hooks for type checking projects.
 */
export interface TypeCheckServiceOptions extends TypeCheckProjectOptions {}

/**
 * Options that are available to configuration hooks for type checking backend services.
 */
export interface TypeCheckPackageOptions extends TypeCheckProjectOptions {}

/**
 * Selects the type checking options that match the provided project type.
 */
export type TypeCheckOptionsForProject<ProjectType extends Project> =
  ProjectType extends App
    ? TypeCheckAppOptions
    : ProjectType extends Service
    ? TypeCheckServiceOptions
    : TypeCheckPackageOptions;

/**
 * Options that are available to configuration hooks for type checking
 * code related to your overall workspace.
 */
export interface TypeCheckWorkspaceOptions {}

/**
 * Hooks provided by sewing-kit for type checking any code project.
 */
export interface TypeCheckProjectConfigurationCoreHooks {}

/**
 * Configuration hooks for type checking any code project.
 */
export interface TypeCheckProjectConfigurationHooks {}

/**
 * Configuration hooks for type checking applications.
 */
export interface TypeCheckAppConfigurationHooks
  extends TypeCheckProjectConfigurationHooks {}

/**
 * Configuration hooks for type checking backend services.
 */
export interface TypeCheckServiceConfigurationHooks
  extends TypeCheckProjectConfigurationHooks {}

/**
 * Configuration hooks for type checking packages.
 */
export interface TypeCheckPackageConfigurationHooks
  extends TypeCheckProjectConfigurationHooks {}

/**
 * Selects the type checking configuration hooks that match the provided
 * project type.
 */
export type TypeCheckConfigurationHooksForProject<ProjectType extends Project> =
  ProjectType extends App
    ? TypeCheckAppConfigurationHooks
    : ProjectType extends Service
    ? TypeCheckServiceConfigurationHooks
    : TypeCheckPackageConfigurationHooks;

/**
 * The full set of resolved type checking hooks for a single project of the
 * provided type. This includes all the core hooks provided automatically,
 * and any hooks added by plugins during the `hooks` phase of running this
 * task. All plugins added by hooks are marked as optional in this type
 * because the plugin that added the type may not have been used in this
 * project.
 */
export type ResolvedTypeCheckProjectConfigurationHooks<
  ProjectType extends Project = Project,
> = ResolvedHooks<TypeCheckConfigurationHooksForProject<ProjectType>> &
  TypeCheckProjectConfigurationCoreHooks;

/**
 * Hooks provided by sewing-kit for type checking the entire workspace.
 */
export interface TypeCheckWorkspaceConfigurationCoreHooks {}

/**
 * Configuration hooks for type checking the entire workspace.
 */
export interface TypeCheckWorkspaceConfigurationHooks {}

/**
 * The full set of resolved type checking hooks for the overall workspace. This
 * includes all the core hooks provided automatically, and any hooks added
 * by plugins during the `hooks` phase of running this task. All plugins
 * added by hooks are marked as optional in this type because the plugin
 * that added the type may not have been used in this project.
 */
export type ResolvedTypeCheckWorkspaceConfigurationHooks =
  ResolvedHooks<TypeCheckWorkspaceConfigurationHooks> &
    TypeCheckWorkspaceConfigurationCoreHooks;

/**
 * The top-level options that can be passed when running the type-check task.
 */
export interface TypeCheckTaskOptions {}

/**
 * The hooks and additional metadata for running the type-check command on
 * a single project.
 */
export interface TypeCheckProjectTask<ProjectType extends Project = Project> {
  /**
   * The project being type checked.
   */
  readonly project: ProjectType;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: TypeCheckTaskOptions;

  /**
   * Access to sewing-kit internals, like the ability to write to sewing-kit’s private
   * directory. This object is particularly useful in plugins, as it offers a clean
   * way of writing temporary files.
   */
  readonly internal: SewingKitInternalContext;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `TypeCheckProjectConfigurationHooks`
   * (or the project-specific variant you want to add hooks for) in
   * `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<TypeCheckConfigurationHooksForProject<ProjectType>>;

  /**
   * Provide additional configuration for type checking the project. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `TypeCheckProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedTypeCheckProjectConfigurationHooks<ProjectType>,
    ResolvedOptions<TypeCheckOptionsForProject<ProjectType>>
  >;

  /**
   * Provide additional steps to run when type checking this project. This
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
    ResolvedTypeCheckProjectConfigurationHooks<ProjectType>,
    TypeCheckOptionsForProject<ProjectType>
  >;
}

/**
 * The full context available to workspace steps for the `type-check`
 * task, including the ability to access the type check configuration
 * for individual projects.
 */
export interface TypeCheckWorkspaceStepAdderContext
  extends WorkspaceStepAdderContext<
    ResolvedTypeCheckWorkspaceConfigurationHooks,
    TypeCheckWorkspaceOptions
  > {
  /**
   * Fetches the type check configuration for the provided project. Like
   * the `configuration()` function available to project-level steps,
   * you can optionally pass type check options for the provided project,
   * and the configuration hooks will be generated separately for
   * every unique set of options.
   */
  projectConfiguration<ProjectType extends Project = Project>(
    project: ProjectType,
    options?: TypeCheckOptionsForProject<ProjectType>,
  ): Promise<ResolvedTypeCheckProjectConfigurationHooks<ProjectType>>;
}

/**
 * The hooks and additional metadata for running the type-check command on
 * the overall workspace.
 */
export interface TypeCheckWorkspaceTask {
  /**
   * The workspace being type checked.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: TypeCheckTaskOptions;

  /**
   * Access to sewing-kit internals, like the ability to write to sewing-kit’s private
   * directory. This object is particularly useful in plugins, as it offers a clean
   * way of writing temporary files.
   */
  readonly internal: SewingKitInternalContext;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `TypeCheckWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<TypeCheckWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for type checking the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `TypeCheckWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedTypeCheckWorkspaceConfigurationHooks,
    ResolvedOptions<TypeCheckWorkspaceOptions>
  >;

  /**
   * Provide additional steps to run when type checking this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<TypeCheckWorkspaceStepAdderContext>;

  /**
   * Gives you access to each project in this workspace. You should pass this
   * function a function that will be called with the same arguments as the `type-check`
   * hook of a project plugin. You can use this hook to add configuration or
   * steps to multiple projects in the workspace.
   */
  project<ProjectType extends Project = Project>(
    handler: (task: TypeCheckProjectTask<ProjectType>) => ValueOrPromise<void>,
  ): void;
}
