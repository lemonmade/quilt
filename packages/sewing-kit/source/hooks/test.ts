import type {ValueOrPromise} from '../types';
import type {Project, Workspace} from '../model';

import type {
  HookAdder,
  ProjectStepAdder,
  ResolvedHooks,
  ResolvedOptions,
  ConfigurationCollector,
  WorkspaceStepAdder,
  WorkspaceStepAdderContext,
} from './shared';

/**
 * Options that are available to configuration hooks for testing any
 * code project.
 */
export interface TestProjectOptions {}

/**
 * Options that are available to configuration hooks for testing
 * code related to your overall workspace.
 */
export interface TestWorkspaceOptions {}

/**
 * Hooks for testing any code project.
 */
export interface TestProjectConfigurationCoreHooks {}

/**
 * Configuration hooks for testing any code project.
 */
export interface TestProjectConfigurationHooks {}

/**
 * The full set of resolved test hooks for a single project. This includes
 * all the core hooks provided automatically, and any hooks added by plugins
 * during the `hooks` phase of running this task. All plugins added by hooks
 * are marked as optional in this type because the plugin that added the type
 * may not have been used in this project.
 */
export type ResolvedTestProjectConfigurationHooks =
  ResolvedHooks<TestProjectConfigurationHooks> &
    TestProjectConfigurationCoreHooks;

/**
 * Hooks for testing the entire workspace.
 */
export interface TestWorkspaceConfigurationCoreHooks {}

/**
 * Configuration hooks for testing the entire workspace.
 */
export interface TestWorkspaceConfigurationHooks {}

/**
 * The full set of resolved testing hooks for the overall workspace. This
 * includes all the core hooks provided automatically, and any hooks added
 * by plugins during the `hooks` phase of running this task. All plugins
 * added by hooks are marked as optional in this type because the plugin
 * that added the type may not have been used in this project.
 */
export type ResolvedTestWorkspaceConfigurationHooks =
  ResolvedHooks<TestWorkspaceConfigurationHooks> &
    TestWorkspaceConfigurationCoreHooks;

/**
 * The top-level options that can be passed when running the test task.
 */
export interface TestTaskOptions {
  /**
   * Test file patterns to focus on for this test run. When this array is empty,
   * all tests should be run (unless there are `excludePatterns`).
   */
  readonly includePatterns: readonly string[];

  /**
   * Test file patterns to ignore for this test run. When this array is empty,
   * all tests should be run (unless there are `includePatterns`).
   */
  readonly excludePatterns: readonly string[];

  /**
   * Whether to re-run tests when related files are updated.
   */
  readonly watch: boolean;

  /**
   * Whether to enable debug modes for test tools that support it. This may include
   * more verbose logging, different error behaviors, enabling interactive debugger
   * hooks, and other configuration changes.
   */
  readonly debug: boolean;
}

/**
 * The hooks and additional metadata for running the test command on
 * a single project.
 */
export interface TestProjectTask {
  /**
   * The project being tested.
   */
  readonly project: Project;

  /**
   * The workspace this project is part of.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: TestTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `TestProjectConfigurationHooks`
   * (or the project-specific variant you want to add hooks for) in
   * `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<TestProjectConfigurationHooks>;

  /**
   * Provide additional configuration for testing the project. Custom
   * hooks can be added to collect additional configuration by
   * augmenting the `TestProjectConfigurationHooks` (or one of the
   * project-specific variants) and using the `hooks` function
   * to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedTestProjectConfigurationHooks,
    ResolvedOptions<TestProjectOptions>
  >;

  /**
   * Provide additional steps to run when testing this project. This
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
    ResolvedTestProjectConfigurationHooks,
    TestProjectOptions
  >;
}

/**
 * The full context available to workspace steps for the `test`
 * task, including the ability to access the test configuration
 * for individual projects.
 */
export interface TestWorkspaceStepAdderContext
  extends WorkspaceStepAdderContext<
    ResolvedTestWorkspaceConfigurationHooks,
    TestWorkspaceOptions
  > {
  /**
   * Fetches the test configuration for the provided project. Like
   * the `configuration()` function available to project-level steps,
   * you can optionally pass test options for the provided project,
   * and the configuration hooks will be generated separately for
   * every unique set of options.
   */
  projectConfiguration<ProjectType extends Project = Project>(
    project: ProjectType,
    options?: TestProjectOptions,
  ): Promise<ResolvedTestProjectConfigurationHooks>;
}

/**
 * The hooks and additional metadata for running the test command on
 * the overall workspace.
 */
export interface TestWorkspaceTask {
  /**
   * The workspace being tested.
   */
  readonly workspace: Workspace;

  /**
   * The options passed by the user when running this task.
   */
  readonly options: TestTaskOptions;

  /**
   * Allows you to create additional hooks that can collect custom
   * configuration. Make sure you augment the `TestWorkspaceConfigurationHooks`
   * in `@quilted/sewing-kit` to allow these hooks to be visible to
   * TypeScript, and to ensure consumers get appropriate type-checking
   * on their use of the hooks.
   */
  readonly hooks: HookAdder<TestWorkspaceConfigurationHooks>;

  /**
   * Provide additional configuration for testing the overall workspace.
   * Custom hooks can be added to collect additional configuration by
   * augmenting the `TestWorkspaceConfigurationHooks` and using the
   * `hooks` function to include your hooks for other plugins to reference.
   */
  readonly configure: ConfigurationCollector<
    ResolvedTestWorkspaceConfigurationHooks,
    ResolvedOptions<TestWorkspaceOptions>
  >;

  /**
   * Provide additional steps to run when testing this workspace. This
   * function is called with a function that can be used to create steps,
   * and a set of utility functions you can use to gather configuration and
   * other context on the project.
   *
   * This function can return one step, an array of steps, or a falsy value
   * to indicate that it is not adding any steps. It can also return a promise
   * for one of these values, if you need to perform async checks to determine
   * what steps need to be added.
   */
  readonly run: WorkspaceStepAdder<TestWorkspaceStepAdderContext>;

  /**
   * Gives you access to each project in this workspace. You should pass this
   * function a function that will be called with the same arguments as the `test`
   * hook of a project plugin. You can use this hook to add configuration or
   * steps to multiple projects in the workspace.
   */
  project(handler: (task: TestProjectTask) => ValueOrPromise<void>): void;
}
