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
} from './hooks.ts';
import type {ValueOrPromise, ValueOrFalsy} from './types.ts';
import type {FileSystem} from './utilities/fs.ts';

// === === === ===
// SHARED
// === === === ===

export const PLUGIN_MARKER = Symbol.for('SewingKit.Plugin');

export interface BasePlugin {
  readonly name: string;
  readonly [PLUGIN_MARKER]: true;
}

// === === === ===
// PROJECTS
// === === === ===

// TODO
export interface PluginCreateHelper<
  Plugin extends ProjectPlugin | WorkspacePlugin,
> {
  readonly fs: FileSystem;
  use(...plugins: ValueOrFalsy<Plugin>[]): void;
}

export interface ProjectPluginHooks {
  /**
   * Perform additional logic when creating this plugin, before any
   * task is actually run. This function is called with a `helper`
   * object that contains some initial context about the project.
   * This helper also has a `use` method, which allows you to automatically
   * include other plugins in any project where this plugin
   * is included. There’s nothing wrong with having a plugin that only
   * implements this method to compose other plugins — a lot of the
   * value of the plugin system is allowing plugins to collaborate
   * together to perform a larger, highly-configurable task.
   */
  create?(helper: PluginCreateHelper<ProjectPlugin>): ValueOrPromise<void>;

  /**
   * Customize the `build` task for an individual project.
   */
  build?(hooks: BuildProjectTask): void | Promise<void>;

  /**
   * Customize the `develop` task for an individual project.
   */
  develop?(hooks: DevelopProjectTask): void | Promise<void>;

  /**
   * Customize the `lint` task for an individual project.
   */
  lint?(hooks: LintProjectTask): void | Promise<void>;

  /**
   * Customize the `test` task for an individual project.
   */
  test?(hooks: TestProjectTask): void | Promise<void>;

  /**
   * Customize the `type-check` task for an individual project.
   */
  typeCheck?(hooks: TypeCheckProjectTask): void | Promise<void>;
}

// TODO
export interface ProjectPlugin extends BasePlugin, ProjectPluginHooks {
  readonly target: 'project';
}

/**
 * Creates a new plugin that applies to a single project.
 */
export function createProjectPlugin(
  plugin: ProjectPluginHooks & Pick<ProjectPlugin, 'name'>,
): ProjectPlugin {
  return {
    ...plugin,
    target: 'project',
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
   * include other plugins in any workspace where this plugin
   * is included. There’s nothing wrong with having a plugin that only
   * implements this method to compose other plugins — a lot of the
   * value of the plugin system is allowing plugins to collaborate
   * together to perform a larger, highly-configurable task.
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
  readonly target: 'workspace';
}

/**
 * Creates a new plugin that applies to the entire workspace.
 */
export function createWorkspacePlugin(
  plugin: WorkspacePluginHooks & Pick<ProjectPlugin, 'name'>,
): WorkspacePlugin {
  return {
    ...plugin,
    target: 'workspace',
    [PLUGIN_MARKER]: true,
  };
}

export type AnyPlugin = ProjectPlugin | WorkspacePlugin;

export function isPlugin(value: unknown): value is AnyPlugin {
  return Boolean((value as any)?.[PLUGIN_MARKER]);
}
