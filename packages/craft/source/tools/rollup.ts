import type {
  Plugin,
  InputOptions,
  OutputOptions,
  PreserveEntrySignaturesOption,
} from 'rollup';
import type {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve';
import type {RollupCommonJSOptions} from '@rollup/plugin-commonjs';

import {createProjectPlugin} from '../kit';
import type {
  Project,
  Workspace,
  WaterfallHook,
  ResolvedHooks,
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

  /**
   * Determines how Rollup will preserve the exports of entry modules.
   */
  rollupPreserveEntrySignatures: WaterfallHook<PreserveEntrySignaturesOption>;
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
   * Extensions to use for bare module specifiers in the node
   * resolution algorithm in rollup.
   *
   * @see https://www.npmjs.com/package/@rollup/plugin-node-resolve#dedupe
   */
  rollupNodeResolveDedupe: WaterfallHook<string[]>;

  /**
   * The options that will be passed to the rollup node-resolve plugin,
   * if it is included.
   *
   * @see https://www.npmjs.com/package/@rollup/plugin-node-resolve
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
  rollupNodeBundle: WaterfallHook<boolean | RollupNodeBundle>;

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
        rollupPreserveEntrySignatures: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<RollupHooks>(({waterfall}) => ({
        rollupInput: waterfall(),
        rollupPlugins: waterfall(),
        rollupExternals: waterfall(),
        rollupInputOptions: waterfall(),
        rollupOutputs: waterfall(),
        rollupPreserveEntrySignatures: waterfall(),
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
export function rollupNode(options?: RollupNodeOptions) {
  return createProjectPlugin({
    name: 'Quilt.Rollup.Node',
    build({project, workspace, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeResolveDedupe: waterfall(),
        rollupNodeBundle: waterfall(),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addConfiguration(project, workspace, configuration, options),
      );
    },
    develop({project, workspace, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeResolveDedupe: waterfall(),
        rollupNodeBundle: waterfall(),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addConfiguration(project, workspace, configuration, options),
      );
    },
  });
}

function addConfiguration(
  project: Project,
  workspace: Workspace,
  configuration:
    | ResolvedBuildProjectConfigurationHooks
    | ResolvedDevelopProjectConfigurationHooks,
  options?: RollupNodeOptions,
) {
  configuration.rollupPlugins?.(async (plugins) => {
    const nodePlugins = await getRollupNodePlugins(
      project,
      workspace,
      configuration,
      options,
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
export async function getRollupNodePlugins(
  project: Project,
  workspace: Workspace,
  {
    runtimes,
    extensions,
    rollupNodeBundle,
    rollupNodeExtensions,
    rollupNodeExportConditions,
    rollupNodeResolveDedupe,
    rollupNodeResolveOptions,
    rollupCommonJSOptions,
  }:
    | ResolvedBuildProjectConfigurationHooks
    | ResolvedDevelopProjectConfigurationHooks,
  {bundle: explicitShouldBundle}: RollupNodeOptions = {},
) {
  const resolvedRuntimes = await runtimes.run([]);

  const defaultExportConditions = ['module', 'import', 'require', 'default'];

  if (
    resolvedRuntimes.length === 0 ||
    resolvedRuntimes.some((runtime) => runtime.target === 'node')
  ) {
    defaultExportConditions.unshift('node');
  }

  if (
    resolvedRuntimes.length === 0 ||
    resolvedRuntimes.some((runtime) => runtime.target === 'browser')
  ) {
    defaultExportConditions.unshift('browser');
  }

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
    rollupNodeExportConditions!.run(defaultExportConditions),
  ]);

  const [finalExtensions, nodeResolveDedupe] = await Promise.all([
    rollupNodeExtensions!.run(baseExtensions),
    rollupNodeResolveDedupe!.run([]),
  ]);

  const [resolveOptions, commonjsOptions] = await Promise.all([
    rollupNodeResolveOptions!.run({
      exportConditions,
      preferBuiltins: true,
      dedupe: nodeResolveDedupe,
      extensions: finalExtensions,
    }),
    rollupCommonJSOptions!.run({}),
  ]);

  let nodeExternalsPlugin: import('rollup').Plugin;

  const defaultShouldBundle =
    explicitShouldBundle == null
      ? {
          builtins: false,
          dependencies: false,
          devDependencies: true,
          peerDependencies: false,
        }
      : normalizeRollupNodeBundle(explicitShouldBundle);
  const shouldBundle = await rollupNodeBundle!.run(defaultShouldBundle);

  if (shouldBundle === true) {
    // If the consumer wants to bundle node dependencies, we use our
    // default bundling config, which inlines all node dependencies
    // other than node builtins.
    nodeExternalsPlugin = nodeExternals({
      builtins: true,
      builtinsPrefix: 'strip',
      deps: false,
      devDeps: false,
      peerDeps: false,
      optDeps: false,
      packagePath: [
        project.packageJson?.path,
        workspace.packageJson?.path,
      ].filter((item): item is string => Boolean(item)),
    });
  } else if (shouldBundle === false) {
    // If the consumer does not want to bundle node dependencies,
    // we mark all dependencies as external.
    nodeExternalsPlugin = nodeExternals({
      builtins: true,
      builtinsPrefix: 'add',
      deps: true,
      devDeps: true,
      peerDeps: true,
      optDeps: true,
      packagePath: [
        project.packageJson?.path,
        workspace.packageJson?.path,
      ].filter((item): item is string => Boolean(item)),
    });
  } else {
    // Use the customized bundling configuration. Because this option
    // is framed as what you bundle, rather than what you externalize,
    // we need to invert all their options, and default any unspecified
    // options to the same value as using `bundle: true`
    const {
      builtins: bundleBuiltins = defaultShouldBundle.builtins,
      dependencies: bundleDependencies = defaultShouldBundle.dependencies,
      devDependencies:
        bundleDevDependencies = defaultShouldBundle.devDependencies,
      peerDependencies:
        bundlePeerDependencies = defaultShouldBundle.peerDependencies,
      include: alwaysBundleDependencies,
      exclude: neverBundleDependencies,
    } = shouldBundle;

    nodeExternalsPlugin = nodeExternals({
      builtins: !bundleBuiltins,
      builtinsPrefix: bundleBuiltins ? 'strip' : 'add',
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
export async function buildWithRollup(
  _project: Project,
  {
    rollupInput,
    rollupPlugins,
    rollupExternals,
    rollupInputOptions,
    rollupOutputs,
    rollupPreserveEntrySignatures,
  }: ResolvedHooks<RollupHooks>,
) {
  const [
    {rollup},
    inputs,
    plugins,
    externals,
    outputs,
    preserveEntrySignatures,
  ] = await Promise.all([
    import('rollup'),
    rollupInput!.run([]),
    rollupPlugins!.run([]),
    rollupExternals!.run([]),
    rollupOutputs!.run([]),
    rollupPreserveEntrySignatures!.run('exports-only'),
  ]);

  const inputOptions = await rollupInputOptions!.run({
    input: inputs,
    external: externals,
    plugins,
    preserveEntrySignatures,
    onwarn(warning, defaultHandler) {
      // Ignore warnings about empty bundles by default.
      if (warning.code === 'EMPTY_BUNDLE') return;

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
