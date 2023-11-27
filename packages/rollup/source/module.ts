import {type InputPluginOption, type RollupOptions} from 'rollup';

import {Project, sourceEntriesForProject} from './shared/project.ts';
import {
  RollupNodePluginOptions,
  getNodePlugins,
  removeBuildFiles,
} from './shared/rollup.ts';
import {
  getBrowserGroupTargetDetails,
  rollupGenerateOptionsForBrowsers,
  type BrowserGroupTargetSelection,
} from './shared/browserslist.ts';
import {resolveEnvOption, type MagicModuleEnvOptions} from './features/env.ts';

export interface ModuleOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * The entry module for this module. This should be an absolute path, or relative
   * path from the root directory containing your project. It can also be an object, where
   * each key is the name of an entry into the module, and each value is the path to the
   * source path for that entry. If not provided, this defaults the detected source files for
   * the the `exports` field in your package.json, then to the `main` field in your package.json,
   * then to a file `index`, `module`, `entry`, or `input` in your project’s root directory.
   *
   * @example './my-module.tsx'
   * @example {browser: './browser.tsx', server: './server.tsx'}
   */
  entry?: string | Record<string, string>;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * Customizes the behavior of environment variables for your module.
   */
  env?: MagicModuleEnvOptions | MagicModuleEnvOptions['mode'];

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
  clean?: boolean;
  hash?: boolean | 'async-only';
  targets?: BrowserGroupTargetSelection;
}

export async function quiltModule({
  root = process.cwd(),
  entry,
  env,
  assets,
  graphql = true,
}: ModuleOptions = {}) {
  const project = Project.load(root);
  const mode = (typeof env === 'object' ? env?.mode : env) ?? 'production';
  const outputDirectory = project.resolve('build/assets');

  const minify = assets?.minify ?? true;
  const hash = assets?.hash ?? 'async-only';
  const bundle = assets?.bundle ?? true;

  const browserGroup = await getBrowserGroupTargetDetails(assets?.targets, {
    root: project.root,
  });
  const targetFilenamePart = browserGroup.name ? `.${browserGroup.name}` : '';

  const [
    {visualizer},
    {magicModuleEnv, replaceProcessEnv},
    {sourceCode},
    {tsconfigAliases},
    {monorepoPackageAliases},
    {react},
    {esnext},
    nodePlugins,
  ] = await Promise.all([
    import('rollup-plugin-visualizer'),
    import('./features/env.ts'),
    import('./features/source-code.ts'),
    import('./features/typescript.ts'),
    import('./features/node.ts'),
    import('./features/react.ts'),
    import('./features/esnext.ts'),
    getNodePlugins({bundle}),
  ]);

  const finalEntry = await resolveModuleEntry(entry, project);

  const plugins: InputPluginOption[] = [
    ...nodePlugins,
    replaceProcessEnv({mode}),
    magicModuleEnv({...resolveEnvOption(env), mode, root: project.root}),
    sourceCode({mode, targets: browserGroup.browsers}),
    tsconfigAliases({root: project.root}),
    monorepoPackageAliases({root: project.root}),
    esnext({mode, targets: browserGroup.browsers}),
    react(),
  ];

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  if (minify) {
    const {minify} = await import('rollup-plugin-esbuild');
    plugins.push(minify());
  }

  if (assets?.clean ?? true) {
    plugins.push(
      removeBuildFiles(['build/assets', 'build/reports'], {
        root: project.root,
      }),
    );
  }

  plugins.push(
    visualizer({
      template: 'treemap',
      open: false,
      brotliSize: true,
      filename: project.resolve(
        `build/reports/bundle-visualizer${targetFilenamePart}.html`,
      ),
    }),
  );

  return {
    input: finalEntry,
    plugins,
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
      generatedCode: await rollupGenerateOptionsForBrowsers(
        browserGroup.browsers,
      ),
      minifyInternalExports: minify,
    },
  } satisfies RollupOptions;
}

async function resolveModuleEntry(
  entry: string | Record<string, string> | undefined,
  project: Project,
) {
  if (entry) {
    if (typeof entry === 'string') {
      const absolutePath = project.resolve(entry);
      return {[project.relative(absolutePath)]: absolutePath};
    } else {
      return Object.fromEntries(
        Object.entries(entry).map(([key, value]) => [
          normalizeEntryName(key),
          project.resolve(value),
        ]),
      );
    }
  }

  const entries = await sourceEntriesForProject(project);
  const entryArray = Object.entries(entries);

  if (entryArray.length > 0) {
    return Object.fromEntries(
      entryArray.map(([key, value]) => [normalizeEntryName(key), value]),
    );
  }

  const sourceFile = (
    await project.glob('{index,module,entry,input}.{ts,tsx,mjs,js,jsx}', {
      nodir: true,
      absolute: true,
    })
  )[0]!;

  return {[normalizeEntryName(project.relative(sourceFile))]: sourceFile};
}

function normalizeEntryName(name: string) {
  return name === '.' ? 'index' : name.startsWith('./') ? name.slice(2) : name;
}
