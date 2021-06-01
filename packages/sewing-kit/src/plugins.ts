import type {Project} from './model';
import type {
  BuildProjectTask,
  BuildWorkspaceTask,
  DevelopProjectTask,
  DevelopWorkspaceTask,
  LintProjectTask,
  LintWorkspaceTask,
  TestProjectTask,
  TestWorkspaceTask,
  TypeCheckProjectTask,
  TypeCheckWorkspaceTask,
} from './hooks';
import type {ValueOrPromise, ValueOrFalsy} from './types';
import type {FileSystem} from './utilities/fs';

// === === === ===
// SHARED
// === === === ===

export const PLUGIN_MARKER = Symbol.for('SewingKit.Plugin');

export enum PluginTarget {
  Project,
  Workspace,
}

export interface BasePlugin {
  readonly name: string;
  readonly target: PluginTarget;
  readonly [PLUGIN_MARKER]: true;
}

// === === === ===
// PROJECTS
// === === === ===

// TODO
export interface PluginCreateHelper<
  Plugin extends ProjectPlugin<any> | WorkspacePlugin
> {
  readonly fs: FileSystem;
  use(...plugins: ValueOrFalsy<Plugin>[]): void;
}

export interface ProjectPluginHooks<ProjectType extends Project = Project> {
  /**
   * Perform additional logic when creating this plugin, before any
   * task is actually run. This function is called with a `helper`
   * object that contains some initial context about the project.
   * This helper also has a `use` method, which allows you to automatically
   * include other sewing-kit plugins in any project where this plugin
   * is included. There’s nothing wrong with having a plugin that only
   * implements this method to compose other plugins — a lot of the
   * value of sewing-kit is allowing plugins to collaborate together to
   * perform a larger, highly-configurable task.
   */
  create?(
    helper: PluginCreateHelper<ProjectPlugin<ProjectType>>,
  ): ValueOrPromise<void>;

  /**
   * Customize the `build` task for an individual project.
   */
  build?(hooks: BuildProjectTask<ProjectType>): void | Promise<void>;

  /**
   * Customize the `develop` task for an individual project.
   */
  develop?(hooks: DevelopProjectTask<ProjectType>): void | Promise<void>;

  /**
   * Customize the `lint` task for an individual project.
   */
  lint?(hooks: LintProjectTask<ProjectType>): void | Promise<void>;

  /**
   * Customize the `test` task for an individual project.
   */
  test?(hooks: TestProjectTask<ProjectType>): void | Promise<void>;

  /**
   * Customize the `type-check` task for an individual project.
   */
  typeCheck?(hooks: TypeCheckProjectTask<ProjectType>): void | Promise<void>;
}

// TODO
export interface ProjectPlugin<ProjectType extends Project = Project>
  extends BasePlugin,
    ProjectPluginHooks<ProjectType> {
  readonly target: PluginTarget.Project;
}

/**
 * Creates a new plugin that applies to a single project. You can optionally
 * supply the generic `ProjectType` type argument to indicate that this plugin
 * can only be used on some project types.
 */
export function createProjectPlugin<ProjectType extends Project = Project>(
  plugin: ProjectPluginHooks<ProjectType> &
    Pick<ProjectPlugin<ProjectType>, 'name'>,
): ProjectPlugin<ProjectType> {
  return {
    ...plugin,
    target: PluginTarget.Project,
    [PLUGIN_MARKER]: true,
  };
}

// === === === ===
// WORKSPACE
// === === === ===

export interface WorkspacePluginHooks {
  /**
   * Perform additional logic when creating this plugin, before any
   * task is actually run. This function is called with a `helper`
   * object that contains some initial context about the workspace.
   * This helper also has a `use` method, which allows you to automatically
   * include other sewing-kit plugins in any workspace where this plugin
   * is included. There’s nothing wrong with having a plugin that only
   * implements this method to compose other plugins — a lot of the
   * value of sewing-kit is allowing plugins to collaborate together to
   * perform a larger, highly-configurable task.
   */
  create?(helper: PluginCreateHelper<WorkspacePlugin>): ValueOrPromise<void>;

  /**
   * Customize the `build` task for the overall workspace.
   */
  build?(hooks: BuildWorkspaceTask): ValueOrPromise<void>;

  /**
   * Customize the `develop` task for the overall workspace.
   */
  develop?(hooks: DevelopWorkspaceTask): ValueOrPromise<void>;

  /**
   * Customize the `lint` task for the overall workspace.
   */
  lint?(hooks: LintWorkspaceTask): ValueOrPromise<void>;

  /**
   * Customize the `test` task for the overall workspace.
   */
  test?(hooks: TestWorkspaceTask): ValueOrPromise<void>;

  /**
   * Customize the `type-check` task for the overall workspace.
   */
  typeCheck?(hooks: TypeCheckWorkspaceTask): ValueOrPromise<void>;
}

// TODO
export interface WorkspacePlugin extends BasePlugin, WorkspacePluginHooks {
  readonly target: PluginTarget.Workspace;
}

/**
 * Creates a new plugin that applies to the entire workspace.
 */
export function createWorkspacePlugin(
  plugin: WorkspacePluginHooks & Pick<ProjectPlugin, 'name'>,
): WorkspacePlugin {
  return {
    ...plugin,
    target: PluginTarget.Workspace,
    [PLUGIN_MARKER]: true,
  };
}
