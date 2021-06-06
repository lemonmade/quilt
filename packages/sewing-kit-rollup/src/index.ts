import type {Plugin, InputOptions, OutputOptions} from 'rollup';
import type {RollupNodeResolveOptions} from '@rollup/plugin-node-resolve';
import type {RollupCommonJSOptions} from '@rollup/plugin-commonjs';

import {
  createProjectPlugin,
  MissingPluginError,
  ProjectKind,
} from '@quilted/sewing-kit';
import type {
  Project,
  WaterfallHook,
  ResolvedBuildProjectConfigurationHooks,
  ResolvedDevelopProjectConfigurationHooks,
} from '@quilted/sewing-kit';

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
    name: 'SewingKit.Rollup',
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
    name: 'SewingKit.Rollup.Node',
    build({project, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeBundle: waterfall(),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addNodeConfiguration(project, configuration),
      );
    },
    develop({project, hooks, configure}) {
      hooks<RollupNodeHooks>(({waterfall}) => ({
        rollupNodeExtensions: waterfall(),
        rollupNodeExportConditions: waterfall(),
        rollupNodeResolveOptions: waterfall(),
        rollupNodeBundle: waterfall(),
        rollupCommonJSOptions: waterfall(),
      }));

      configure((configuration) =>
        addNodeConfiguration(project, configuration),
      );
    },
  });

  function addNodeConfiguration(
    project: ProjectType,
    {
      extensions,
      rollupPlugins,
      rollupNodeBundle,
      rollupNodeExtensions,
      rollupNodeExportConditions,
      rollupNodeResolveOptions,
      rollupCommonJSOptions,
    }:
      | ResolvedBuildProjectConfigurationHooks<ProjectType>
      | ResolvedDevelopProjectConfigurationHooks<ProjectType>,
  ) {
    rollupPlugins?.(async (plugins) => {
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
        extensions.run(['.mjs', '.js', '.json', '.node']),
        rollupNodeExportConditions!.run([
          'default',
          'module',
          'import',
          'require',
        ]),
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

      const defaultShouldBundle = project.kind !== ProjectKind.Package;
      const shouldBundle = await rollupNodeBundle!.run(
        explicitShouldBundle ?? defaultShouldBundle,
      );

      if (shouldBundle === true) {
        // If the consumer wants to bundle node dependencies, we use our
        // default bundling config, which inlines all node dependencies
        // other than node builtins.
        nodeExternalsPlugin = nodeExternals({
          builtins: true,
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
          deps: !bundleDependencies,
          devDeps: !bundleDevDependencies,
          peerDeps: !bundlePeerDependencies,
          optDeps: !bundlePeerDependencies,
          include: neverBundleDependencies,
          exclude: alwaysBundleDependencies,
          packagePath: project.packageJson?.path,
        });
      }

      return [
        nodeExternalsPlugin,
        nodeResolve(resolveOptions),
        commonjs(commonjsOptions),
        json(),
        ...plugins,
      ];
    });
  }
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
 *       import('@quilted/sewing-kit-rollup'),
 *     ]);
 *
 *     await buildWithRollup(configure);
 *   },
 * })
 */
export async function buildWithRollup<ProjectType extends Project = Project>({
  rollupInput,
  rollupPlugins,
  rollupExternals,
  rollupInputOptions,
  rollupOutputs,
}: ResolvedBuildProjectConfigurationHooks<ProjectType>) {
  if (
    rollupInput == null ||
    rollupPlugins == null ||
    rollupExternals == null ||
    rollupInputOptions == null ||
    rollupOutputs == null
  ) {
    throw new MissingPluginError('rollupHooks', '@quilted/sewing-kit-rollup');
  }

  const [{rollup}, inputs, plugins, externals, outputs] = await Promise.all([
    import('rollup'),
    rollupInput.run([]),
    rollupPlugins.run([]),
    rollupExternals.run([]),
    rollupOutputs.run([]),
  ]);

  const inputOptions = await rollupInputOptions!.run({
    input: inputs,
    external: externals,
    plugins,
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
  // console.log(bundle);
  await Promise.all(outputs.map((output) => bundle.write(output)));
}
