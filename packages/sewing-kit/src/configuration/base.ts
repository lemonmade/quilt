import {basename, dirname} from 'path';

import {PLUGIN_MARKER, PluginTarget, PluginCreateHelper} from '../plugins';
import type {WorkspacePlugin, ProjectPlugin} from '../plugins';

import {FileSystem} from '../utilities/fs';

import {DiagnosticError} from '../errors';
import {PackageJson} from '../utilities/dependencies';

type WritableValue<T> = T extends readonly (infer U)[] ? U[] : T;

type Writable<T> = {
  -readonly [K in keyof T]: WritableValue<T[K]>;
};

export enum ConfigurationKind {
  App = 'App',
  Service = 'Service',
  Package = 'Package',
  Workspace = 'Workspace',
}

export const BUILDER_RESULT_MARKER = Symbol.for('SewingKit.BuilderResult');

const DIRECTORIES_NOT_TO_USE_FOR_NAME = new Set(['src', 'source', 'lib']);

export interface ConfigurationBuilderResult<Options = unknown> {
  readonly kind: ConfigurationKind;
  readonly root: string;
  readonly name: string;
  readonly options: Partial<Writable<Options>>;
  readonly workspacePlugins: readonly WorkspacePlugin[];
  readonly projectPlugins: readonly ProjectPlugin[];
  readonly [BUILDER_RESULT_MARKER]: true;
}

export class BaseBuilder<PluginType, Options> {
  readonly fs: FileSystem;
  readonly packageJson?: PackageJson;

  protected readonly options: Partial<Writable<Options>> = {};
  private readonly workspacePlugins = new Set<WorkspacePlugin>();
  private readonly projectPlugins = new Set<ProjectPlugin>();

  private readonly kind: ConfigurationKind;
  private readonly root: string;
  private named: string;

  constructor(root: string, kind: ConfigurationKind) {
    this.root = root;
    this.kind = kind;
    this.fs = new FileSystem(root);
    this.packageJson = PackageJson.load(this.root);

    const rootDirectoryName = dirname(root);

    this.named =
      nameFromPackageJson(this.packageJson) ??
      (DIRECTORIES_NOT_TO_USE_FOR_NAME.has(rootDirectoryName)
        ? basename(dirname(root))
        : rootDirectoryName);
  }

  /**
   * Provide a custom name for this project. If none is provided, the name
   * of the directory for this project is used.
   */
  name(name: string) {
    this.named = name;
    return this;
  }

  /**
   * Provide one or more plugins that will be used for this project. If
   * you are creating a project, you can only provide plugins that support
   * that project type; if you are creating a workspace, you can only provide
   * workspace plugins. For convenience, if you have only a single project in
   * your repo, **and** you define only one sewing-kit.config file in the repo,
   * you can include both project and workspace plugins. Additionally, you
   * can pass falsy values to this function, and they will be omitted; this
   * generally makes it simpler to conditionally include plugins, by following
   * the this pattern:
   *
   * ```ts
   * import {createApp} from '@quilted/sewing-kit';
   * import {myPlugin} from './sewing-kit-plugins';
   *
   * export default createApp((app) => {
   *   app.use(shouldUsePlugin && myPlugin());
   * });
   * ```
   */
  use(...plugins: (PluginType | WorkspacePlugin | false | undefined | null)[]) {
    for (const pluginTyped of plugins) {
      const plugin = pluginTyped as any;

      if (!plugin) continue;

      if (!plugin[PLUGIN_MARKER]) {
        throw new DiagnosticError({
          title: 'Invalid configuration file',
          content: 'The configuration contains invalid plugins',
          suggestion: `Make sure that all plugins included in the configuration file were generated using the utilities from @sewing-kit/plugin. If this is the case, you may have duplicate versions of some @sewing-kit dependencies. Resolve any duplicate versions and try your command again.`,
        });
      }

      if (plugin.target === PluginTarget.Workspace) {
        this.workspacePlugins.add(plugin);
      } else {
        this.projectPlugins.add(plugin);
      }
    }

    return this;
  }

  async finalize(): Promise<ConfigurationBuilderResult<Options>> {
    const [workspacePlugins, projectPlugins] = await Promise.all([
      expandPlugins(this.workspacePlugins, {fs: this.fs}),
      expandPlugins(this.projectPlugins, {fs: this.fs}),
    ]);

    return {
      kind: this.kind,
      root: this.root,
      name: this.named,
      options: this.options,
      workspacePlugins,
      projectPlugins,
      [BUILDER_RESULT_MARKER]: true,
    };
  }
}

async function expandPlugins<
  Plugin extends ProjectPlugin<any> | WorkspacePlugin,
>(
  plugins: Iterable<Plugin>,
  helper: Omit<PluginCreateHelper<Plugin>, 'use'>,
): Promise<Plugin[]> {
  const expanded = await Promise.all(
    [...plugins].map(async (plugin) => {
      if (plugin.create == null) return plugin;

      const usedPlugins: Plugin[] = [];

      plugin.create({
        ...helper,
        use(...newPlugins: Plugin[]) {
          for (const newPlugin of newPlugins) {
            if (newPlugin) usedPlugins.push(newPlugin);
          }
        },
      } as PluginCreateHelper<Plugin> as any);

      return expandPlugins(usedPlugins, helper);
    }),
  );

  return expanded.flat() as Plugin[];
}

function nameFromPackageJson(packageJson?: PackageJson) {
  const name = packageJson?.name;

  if (!name) return undefined;

  // Take the base part of a scoped package name, or the whole
  // package name if not scoped.
  return name.startsWith('@') ? name.split('/')[1] : name;
}
