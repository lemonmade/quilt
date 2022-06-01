import type {Plugin, InputOptions, OutputOptions} from 'rollup';
import type {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve';
import type {RollupCommonJSOptions} from '@rollup/plugin-commonjs';

import {App, createProjectPlugin, ProjectKind, Runtime} from '../kit';
import type {
  Project,
  Workspace,
  WaterfallHook,
  WaterfallHookWithDefault,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '../kit';

// TODO
export interface RollupNodeBundle {
  readonly builtins?: boolean;
  readonly dependencies?: boolean;
  readonly devDependencies?: boolean;
  readonly peerDependencies?: boolean;
  readonly exclude?: (string | RegExp)[];
  readonly include?: (string | RegExp)[];
}

export interface RollupHooks {
  /**
   * Input files for that rollup will use as the entry
   * into your project.
   */
  rollupInput: WaterfallHook<string[]>;

  /**
   * Rollup plugins to include for this project.
   */
  rollupPlugins: WaterfallHook<Plugin[]>;

  /**
   * Additional modules to treat as external for this build.
   */
  rollupExternals: WaterfallHook<(string | RegExp)[]>;

  /**
   * Adjustments to make to the entire rollup input option
   * for this project, excluding the `outputs` (which can be
   * configured with the `rollupOutputs` hook instead).
   */
  rollupInputOptions: WaterfallHook<InputOptions>;

  /**
   * Rollup outputs to generate for this project.
   */
  rollupOutputs: WaterfallHook<OutputOptions[]>;
}

export interface RollupNodeHooks {
  /**
   * Export conditions to use for the node resolution plugin,
   * if it is included.
   */
  rollupNodeExportConditions: WaterfallHook<string[]>;

  /**
   * Extensions to use for bare module specifiers in the node
   * resolution algorithm in rollup.
   */
  rollupNodeExtensions: WaterfallHook<string[]>;

  /**
   * The options that will be passed to the rollup node-resolve plugin,
   * if it is included.
   */
  rollupNodeResolveOptions: WaterfallHook<RollupNodeResolveOptions>;

  /**
   * Controls how dependencies from node_modules will be bundled into
   * your rollup build. This can either be `true`, indicating that all
   * dependencies (except node builtins, like `fs`) will be bundled;
   * `false`, indicating that all node dependencies should be treated as
   * external in the resulting build; or a `RollupNodeBundle` object
   * that gives fine-grained control over how node dependencies are
   * bundled. The default is `true` for packages, and `false` for all
   * other projects.
   */
  rollupNodeBundle: WaterfallHookWithDefault<boolean | RollupNodeBundle>;

  /**
   * The options that will be passed to the rollup commonjs plugin,
   * if it is included.
   */
  rollupCommonJSOptions: WaterfallHook<RollupCommonJSOptions>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks
    extends RollupHooks,
      RollupNodeHooks {}

  interface DevelopProjectConfigurationHooks
    extends RollupHooks,
      RollupNodeHooks {}
}

/**
 * Adds basic Rollup hooks that other plugins can attach configuration to.
 */
export function rollupHooks() {
  return createProjectPlugin({
    name: 'Quilt.Rollup',
    build({hooks}) {
      hooks<RollupHooks>(({waterfall}) => ({
        rollupInput: waterfall(),
        rollupPlugins: waterfall(),
        rollupExternals: waterfall(),
        rollupInputOptions: waterfall(),
        rollupOutputs: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<RollupHooks>(({waterfall}) => ({
        rollupInput: waterfall(),
        rollupPlugins: waterfall(),
        rollupExternals: waterfall(),
        rollupInputOptions: waterfall(),
        rollupOutputs: waterfall(),
      }));
    },
  });
}

// TODO
export interface RollupNodeOptions {
  readonly bundle?: boolean | RollupNodeBundle;
}

/**
 * Creates a plugin that configures rollup to be able to import most
 * Node.js code. Specifically, this plugin adds the node-resolve and
 * commonjs Rollup plugins, which allow Rollup-based builds to import
 * from Node.js dependencies, using Node.js resolution.
 */
export function rollupNode<ProjectType extends Project = Project>({
  bundle: explicitShouldBundle,
}: RollupNodeOptions = {}) {
  return createProjectPlugin<ProjectType>({
    name: 'Quilt.Rollup.Node',
    build({project, workspace, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeBundle: waterfall({
          default: explicitShouldBundle ?? project.kind !== ProjectKind.Package,
        }),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addConfiguration(project, workspace, configuration),
      );
    },
    develop({project, workspace, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeBundle: waterfall<RollupNodeBundle | boolean>({
          default: false,
        }),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addConfiguration(project, workspace, configuration),
      );
    },
  });
}

function addConfiguration<ProjectType extends Project>(
  project: ProjectType,
  workspace: Workspace,
  configuration:
    | ResolvedBuildProjectConfigurationHooks<ProjectType>
    | ResolvedDevelopProjectConfigurationHooks<ProjectType>,
) {
  configuration.rollupPlugins?.(async (plugins) => {
    const nodePlugins = await getRollupNodePlugins(
      project,
      workspace,
      configuration,
    );
    plugins.unshift(...nodePlugins);
    return plugins;
  });
}

/**
 * Runs the node-related rollup hooks added by this library, and
 * returns a set of plugins that configure rollup to work well with
 * Node.
 */
export async function getRollupNodePlugins<ProjectType extends Project>(
  project: ProjectType,
  workspace: Workspace,
  {
    runtime,
    extensions,
    rollupNodeBundle,
    rollupNodeExtensions,
    rollupNodeExportConditions,
    rollupNodeResolveOptions,
    rollupCommonJSOptions,
  }:
    | ResolvedBuildProjectConfigurationHooks<ProjectType>
    | ResolvedDevelopProjectConfigurationHooks<ProjectType>,
) {
  const targetRuntime = await runtime.run();

  const [
    {default: commonjs},
    {default: json},
    {default: nodeResolve},
    {default: nodeExternals},
    baseExtensions,
    exportConditions,
  ] = await Promise.all([
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-node-resolve'),
    import('rollup-plugin-node-externals'),
    extensions.run(['.mjs', '.cjs', '.js', '.json', '.node']),
    rollupNodeExportConditions!.run(
      targetRuntime.includes(Runtime.Node)
        ? ['node', 'module', 'import', 'require', 'default']
        : targetRuntime.includes(Runtime.Browser)
        ? ['browser', 'module', 'import', 'require', 'default']
        : ['module', 'import', 'require', 'default'],
    ),
  ]);

  const finalExtensions = await rollupNodeExtensions!.run(baseExtensions);

  const [resolveOptions, commonjsOptions] = await Promise.all([
    rollupNodeResolveOptions!.run({
      exportConditions,
      extensions: finalExtensions,
    }),
    rollupCommonJSOptions!.run({}),
  ]);

  let nodeExternalsPlugin: import('rollup').Plugin;

  const defaultShouldBundle = project.kind === ProjectKind.App;
  const shouldBundle = await rollupNodeBundle!.run();

  if (shouldBundle === true) {
    // If the consumer wants to bundle node dependencies, we use our
    // default bundling config, which inlines all node dependencies
    // other than node builtins.
    nodeExternalsPlugin = nodeExternals({
      builtins: true,
      prefixedBuiltins: true,
      deps: false,
      devDeps: false,
      peerDeps: false,
      optDeps: false,
      packagePath: project.packageJson?.path,
    });
  } else if (shouldBundle === false) {
    // If the consumer does not want to bundle node dependencies,
    // we mark all dependencies as external.
    // If the consumer does not want to bundle node dependencies,
    // we mark all dependencies as external.
    nodeExternalsPlugin = nodeExternals({
      builtins: true,
      prefixedBuiltins: true,
      deps: true,
      devDeps: true,
      peerDeps: true,
      optDeps: true,
      packagePath: project.packageJson?.path,
    });
  } else {
    // Use the customized bundling configuration. Because this option
    // is framed as what you bundle, rather than what you externalize,
    // we need to invert all their options, and default any unspecified
    // options to the same value as using `bundle: true`
    const {
      builtins: bundleBuiltins = false,
      dependencies: bundleDependencies = defaultShouldBundle,
      devDependencies: bundleDevDependencies = defaultShouldBundle,
      peerDependencies: bundlePeerDependencies = defaultShouldBundle,
      include: alwaysBundleDependencies,
      exclude: neverBundleDependencies,
    } = shouldBundle;

    nodeExternalsPlugin = nodeExternals({
      builtins: !bundleBuiltins,
      prefixedBuiltins: !bundleBuiltins,
      deps: !bundleDependencies,
      devDeps: !bundleDevDependencies,
      peerDeps: !bundlePeerDependencies,
      optDeps: !bundlePeerDependencies,
      include: neverBundleDependencies,
      exclude: alwaysBundleDependencies,
      packagePath: [
        project.packageJson?.path,
        workspace.packageJson?.path,
      ].filter((item): item is string => Boolean(item)),
    });
  }

  return [
    nodeExternalsPlugin,
    nodeResolve(resolveOptions),
    commonjs(commonjsOptions),
    json(),
  ];
}

/**
 * Takes the configuration hooks for a development or build task,
 * and generates a rollup build based on that configuration.
 *
 * @example
 * step({
 *   name: 'MyPlugin.BuildWithRollup',
 *   label: 'Build outputs with rollup',
 *   async run() {
 *     const [configure, {buildWithRollup}] = await Promise.all([
 *       configuration(),
 *       import('@quilted/craft/rollup'),
 *     ]);
 *
 *     await buildWithRollup(project, configure);
 *   },
 * })
 */
export async function buildWithRollup<ProjectType extends Project = Project>(
  project: ProjectType,
  {
    runtime,
    rollupInput,
    rollupPlugins,
    rollupExternals,
    rollupInputOptions,
    rollupOutputs,
  }: ResolvedBuildProjectConfigurationHooks<ProjectType>,
) {
  const [{rollup}, targetRuntime, inputs, plugins, externals, outputs] =
    await Promise.all([
      import('rollup'),
      runtime.run(),
      rollupInput!.run([]),
      rollupPlugins!.run([]),
      rollupExternals!.run([]),
      rollupOutputs!.run([]),
    ]);

  const inputOptions = await rollupInputOptions!.run({
    input: inputs,
    external: externals,
    plugins,
    // When we are only building a web app, we don’t care about preserving
    // any details about the entry module. When we are building for any other
    // environment, we want to do our best to preserve that
    preserveEntrySignatures:
      project instanceof App &&
      targetRuntime.includes(Runtime.Browser) &&
      targetRuntime.runtimes.size === 1
        ? false
        : 'exports-only',
    onwarn(warning, defaultHandler) {
      // Ignore warnings about empty bundles by default.
      if (warning.code === 'EMPTY_BUNDLE') return;

      // This warning complains about arrow functions at the top-level scope
      // of a module.
      if (warning.code === 'THIS_IS_UNDEFINED') return;

      defaultHandler(warning);
    },
  });

  if (
    inputOptions.input == null ||
    inputOptions.input.length === 0 ||
    outputs.length === 0
  ) {
    return;
  }

  const bundle = await rollup(inputOptions);
  await Promise.all(outputs.map((output) => bundle.write(output)));
}

export function addRollupNodeBundleInclusion(
  inclusion: string | RegExp | (string | RegExp)[],
  existingBundle: boolean | RollupNodeBundle,
) {
  const normalized = normalizeRollupNodeBundle(existingBundle);

  return {
    ...normalized,
    include: [
      ...(normalized.include ?? []),
      ...(Array.isArray(inclusion) ? inclusion : [inclusion]),
    ],
  };
}

export function addRollupNodeBundleExclusion(
  exclusion: string | RegExp | (string | RegExp)[],
  existingBundle: boolean | RollupNodeBundle,
): RollupNodeBundle {
  const normalized = normalizeRollupNodeBundle(existingBundle);

  return {
    ...normalized,
    exclude: [
      ...(normalized.exclude ?? []),
      ...(Array.isArray(exclusion) ? exclusion : [exclusion]),
    ],
  };
}

export function normalizeRollupNodeBundle(
  existingBundle: boolean | RollupNodeBundle,
): RollupNodeBundle {
  const shouldBundle = Boolean(existingBundle);

  return {
    builtins: false,
    dependencies: shouldBundle,
    devDependencies: shouldBundle,
    peerDependencies: shouldBundle,
    ...(typeof existingBundle === 'boolean' ? {} : existingBundle),
  };
}

export function addRollupOnWarn(
  options: InputOptions,
  warn: NonNullable<InputOptions['onwarn']>,
): InputOptions {
  const {onwarn: originalOnWarn} = options;

  return {
    ...options,
    onwarn(warning, defaultWarn) {
      warn(warning, (warning) => {
        if (originalOnWarn) {
          originalOnWarn(warning, defaultWarn);
        } else {
          defaultWarn(warning);
        }
      });
    },
  };
}
