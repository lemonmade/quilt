import * as path from 'path';
import {Plugin, type RollupOptions} from 'rollup';
import {glob} from 'glob';

import {resolveRoot} from './shared/path.ts';
import {
  RollupNodePluginOptions,
  getNodePlugins,
  removeBuildFiles,
} from './shared/rollup.ts';
import {loadPackageJSON, type PackageJSON} from './shared/package-json.ts';
import {
  getBrowserGroupTargetDetails,
  type BrowserGroupTargetSelection,
} from './shared/browserslist.ts';
import type {MagicModuleEnvOptions} from './features/env.ts';

export interface ModuleOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this module. This should be an absolute path, or relative
   * path from the root directory containing your project. If not provided, this
   * defaults the `main` or `exports['.']` field in your package.json, or a file named
   * `index`, `module`, `entry`, or `input` in your project root.
   *
   * @example './my-module.tsx'
   */
  entry?: string;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * Customizes the behavior of environment variables for your module.
   */
  env?: MagicModuleEnvOptions;

  /**
   * Customizes the assets created for your module.
   */
  assets?: ModuleAssetsOptions;
}

export interface ModuleAssetsOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
  /**
   * Whether to minify assets created for this module.
   *
   * @default true
   */
  minify?: boolean;
  hash?: boolean | 'async-only';
  targets?: BrowserGroupTargetSelection;
}

export async function quiltModule({
  root: rootPath = process.cwd(),
  entry,
  env,
  assets,
  graphql = true,
}: ModuleOptions = {}) {
  const root = resolveRoot(rootPath);
  const mode =
    (typeof env === 'object' ? env?.mode : undefined) ?? 'production';
  const outputDirectory = path.join(root, 'build/assets');

  const minify = assets?.minify ?? true;
  const hash = assets?.hash ?? 'async-only';
  const bundle = assets?.bundle ?? true;

  const browserTarget = await getBrowserGroupTargetDetails(assets?.targets, {
    root,
  });
  const targetFilenamePart = browserTarget.name ? `.${browserTarget.name}` : '';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {esnext},
    nodePlugins,
    packageJSON,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({bundle}),
    loadPackageJSON(root),
  ]);

  const finalEntry = entry
    ? path.resolve(root, entry)
    : await sourceForModule(root, packageJSON);

  const plugins: Plugin[] = [
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({...env, mode}),
    sourceCode({mode, targets: browserTarget.browsers}),
    esnext({mode, targets: browserTarget.browsers}),
    removeBuildFiles(['build/assets', 'build/reports'], {root}),
  ];

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: path.resolve(
        root,
        `build/reports/bundle-visualizer${targetFilenamePart}.html`,
      ),
    }),
  );

  return {
    input: finalEntry,
    plugins,
    onwarn(warning, defaultWarn) {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        /['"]use client['"]/.test(warning.message)
      ) {
        return;
      }

      defaultWarn(warning);
    },
    output: {
      format: 'esm',
      dir: outputDirectory,
      entryFileNames: `[name]${targetFilenamePart}${
        hash === true ? `.[hash]` : ''
      }.js`,
      chunkFileNames: `[name]${targetFilenamePart}${
        hash === true || hash === 'async-only' ? `.[hash]` : ''
      }.js`,
      assetFileNames: `[name]${targetFilenamePart}${
        hash === true ? `.[hash]` : ''
      }.[ext]`,
    },
  } satisfies RollupOptions;
}

async function sourceForModule(root: string, packageJSON: PackageJSON) {
  const {main, exports} = packageJSON;

  const entryFromPackageJSON = main ?? (exports as any)?.['.'];

  if (entryFromPackageJSON) {
    return path.resolve(root, entryFromPackageJSON);
  }

  const possibleSourceFiles = await glob(
    '{index,module,entry,input}.{ts,tsx,mjs,js,jsx}',
    {
      cwd: root,
      nodir: true,
      absolute: true,
    },
  );

  return possibleSourceFiles[0]!;
}
