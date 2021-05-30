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
        rollupInputOptions: waterfall(),
        rollupOutputs: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<RollupHooks>(({waterfall}) => ({
        rollupInput: waterfall(),
        rollupPlugins: waterfall(),
        rollupInputOptions: waterfall(),
        rollupOutputs: waterfall(),
      }));
    },
  });
}

// TODO
export interface RollupNodeBundle {
  readonly builtins?: boolean;
  readonly dependencies?: boolean;
  readonly devDependencies?: boolean;
  readonly peerDependencies?: boolean;
  readonly exclude?: (string | RegExp)[];
  readonly include?: (string | RegExp)[];
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

      const shouldBundle =
        explicitShouldBundle ?? project.kind !== ProjectKind.Package;

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
          dependencies: bundleDependencies = true,
          devDependencies: bundleDevDependencies = true,
          peerDependencies: bundlePeerDependencies = true,
        } = shouldBundle;

        nodeExternalsPlugin = nodeExternals({
          builtins: !bundleBuiltins,
          deps: !bundleDependencies,
          devDeps: !bundleDevDependencies,
          peerDeps: !bundlePeerDependencies,
          optDeps: !bundlePeerDependencies,
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
 * and generates a rollup build based on the configuration in the
 * hooks added by `rollupHooks()`.
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
  rollupInputOptions,
  rollupOutputs,
}: ResolvedBuildProjectConfigurationHooks<ProjectType>) {
  if (
    rollupInput == null ||
    rollupPlugins == null ||
    rollupInputOptions == null ||
    rollupOutputs == null
  ) {
    throw new MissingPluginError('rollupHooks', '@quilted/sewing-kit-rollup');
  }

  const [{rollup}, inputs, plugins, outputs] = await Promise.all([
    import('rollup'),
    rollupInput!.run([]),
    rollupPlugins!.run([]),
    rollupOutputs!.run([]),
  ]);

  const inputOptions = await rollupInputOptions!.run({
    input: inputs,
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
  await Promise.all(outputs.map((output) => bundle.write(output)));
}
