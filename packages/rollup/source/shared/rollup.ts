import * as fs from 'fs/promises';
import {glob} from 'glob';

import type {Plugin, InputOption, InputOptions} from 'rollup';
import replace, {type RollupReplaceOptions} from '@rollup/plugin-replace';

export function smartReplace(
  values: NonNullable<RollupReplaceOptions['values']>,
  options?: Omit<RollupReplaceOptions, 'values'>,
) {
  return replace({
    // @see https://github.com/vitejs/vite/blob/2b1ffe86328f9d06ef9528ee117b61889893ddcc/packages/vite/src/node/plugins/define.ts#L108-L119
    delimiters: [
      '(?<![\\p{L}\\p{N}_$]|(?<!\\.\\.)\\.)(',
      ')(?:(?<=\\.)|(?![\\p{L}\\p{N}_$]|\\s*?=[^=]))',
    ],
    preventAssignment: true,
    ...options,
    values,
  });
}

export function removeBuildFiles(
  patterns: string | string[],
  {root = process.cwd()}: {root?: string} = {},
) {
  return {
    name: '@quilt/remove-build-files',
    async buildStart() {
      const matches = await glob(patterns, {
        cwd: root,
        absolute: true,
      });

      await Promise.all(
        matches.map((file) => fs.rm(file, {recursive: true, force: true})),
      );
    },
  } satisfies Plugin;
}

export function normalizeRollupInput(input?: InputOption) {
  return Array.isArray(input) && input.length === 0 ? undefined : input;
}

export interface RollupNodeBundle {
  readonly builtins?: boolean;
  readonly dependencies?: boolean;
  readonly devDependencies?: boolean;
  readonly peerDependencies?: boolean;
  readonly exclude?: (string | RegExp)[];
  readonly include?: (string | RegExp)[];
}

export interface RollupNodePluginOptions {
  /**
   * Controls how dependencies from node_modules will be bundled into
   * your rollup build. This can either be `true`, indicating that all
   * dependencies (except node builtins, like `fs`) will be bundled;
   * `false`, indicating that all node dependencies should be treated as
   * external in the resulting build; or a `RollupNodeBundle` object
   * that gives fine-grained control over how node dependencies are
   * bundled. The options in the `RollupNodeBundle` object indicate
   * which dependencies to bundle into your project; this is similar to
   * the options provided to [`rollup-plugin-node-externals`](https://github.com/Septh/rollup-plugin-node-externals),
   * except that those options are inverted (e.g., they indicate which
   * modules to externalize, rather than which modules to bundle).
   *
   * @see https://github.com/Septh/rollup-plugin-node-externals
   */
  bundle?: boolean | RollupNodeBundle;

  /**
   * Additional options to the `@rollup/plugin-node-resolve` plugin.
   */
  resolve?: {
    /**
     * Additional export conditions to use when resolving `exports` fields in `package.json`.
     */
    exportConditions?: string[];
  };
}

export async function getNodePlugins({
  bundle = {},
  resolve = {},
}: RollupNodePluginOptions = {}) {
  const [
    {default: commonjs},
    {default: json},
    {default: nodeResolve},
    {default: nodeExternals},
  ] = await Promise.all([
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-node-resolve'),
    import('rollup-plugin-node-externals'),
  ]);

  let nodeExternalsOptions: Parameters<typeof nodeExternals>[0];

  if (bundle === true) {
    // If the consumer wants to bundle node dependencies, we use our
    // default bundling config, which inlines all node dependencies
    // other than node builtins.
    nodeExternalsOptions = {
      builtins: true,
      builtinsPrefix: 'add',
      deps: false,
      devDeps: false,
      peerDeps: false,
      optDeps: false,
    };
  } else if (bundle === false) {
    // If the consumer does not want to bundle node dependencies,
    // we mark all dependencies as external.
    nodeExternalsOptions = {
      builtins: true,
      builtinsPrefix: 'add',
      deps: true,
      devDeps: true,
      peerDeps: true,
      optDeps: true,
    };
  } else {
    // Use the customized bundling configuration. Because this option
    // is framed as what you bundle, rather than what you externalize,
    // we need to invert all their options. For options that aren’t set,
    // we default to bundling only development dependencies — production
    // dependencies and node built-ins are not bundled.
    const {
      builtins: bundleBuiltins = false,
      dependencies: bundleDependencies = false,
      devDependencies: bundleDevDependencies = true,
      peerDependencies: bundlePeerDependencies = false,
      include: alwaysBundleDependencies,
      exclude: neverBundleDependencies,
    } = bundle;

    nodeExternalsOptions = {
      builtins: !bundleBuiltins,
      builtinsPrefix: 'add',
      deps: !bundleDependencies,
      devDeps: !bundleDevDependencies,
      peerDeps: !bundlePeerDependencies,
      optDeps: !bundlePeerDependencies,
      include: neverBundleDependencies,
      exclude: alwaysBundleDependencies,
    };
  }

  return [
    nodeExternals(nodeExternalsOptions),
    nodeResolve({
      preferBuiltins: true,
      dedupe: [],
      extensions: ['.ts', '.tsx', '.mts', '.mtsx', '.mjs', '.js', '.jsx'],
      exportConditions: [
        'esnext',
        'quilt:esnext',
        ...(resolve.exportConditions ?? []),
        'default',
        'module',
        'import',
      ],
    }),
    commonjs(),
    json(),
  ];
}

export function rollupPluginsToArray(plugins?: InputOptions['plugins']) {
  return Array.isArray(plugins) ? [...plugins] : plugins ? [plugins] : [];
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
        if (originalOnWarn && typeof warning === 'object') {
          originalOnWarn(warning, defaultWarn);
        } else {
          defaultWarn(warning);
        }
      });
    },
  };
}
