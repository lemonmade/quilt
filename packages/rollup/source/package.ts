import * as path from 'path';
import * as fs from 'fs/promises';
import {exec as execCommand} from 'child_process';
import {fileURLToPath} from 'url';
import {promisify} from 'util';

import {Plugin, type RollupOptions, type OutputOptions} from 'rollup';
import {glob} from 'glob';

import {multiline} from './shared/strings.ts';
import {
  getNodePlugins,
  removeBuildFiles,
  type RollupNodePluginOptions,
} from './shared/rollup.ts';
import {loadPackageJSON, type PackageJSON} from './shared/package-json.ts';

export interface PackageBaseOptions
  extends Pick<RollupNodePluginOptions, 'bundle'> {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;

  /**
   * Whether to include GraphQL-related code transformations.
   *
   * @default true
   */
  graphql?: boolean;

  /**
   * A map of package entry to source file name. The keys in this
   * object should be in the same format as the keys for the `exports`
   * property in the package.json file. For example, the following object
   * species a "root" entry point
   *
   * ```ts
   * quiltPackage({
   *   entries: {
   *     '.': './source/index.ts',
   *     './testing': './source/testing.ts',
   *   },
   * });
   * ```
   *
   * When you do not explicitly provide this option, Quilt will provide a
   * default option that reads the `exports` property of your package.json,
   * and attempts to infer the source files for the entry points listed
   * there.
   */
  entries?: Record<string, string>;

  /**
   * Customizes the Rollup options used to build your package. This function
   * is called with the default options determined by Quilt, so you can override
   * them however you like. Alternatively, you can provide a static object of
   * Rollup options, which will be merged with the defaults provided by Quilt.
   */
  customize?:
    | RollupOptions
    | ((options: RollupOptions) => RollupOptions | Promise<RollupOptions>);
}

export interface PackageESModuleOptions extends PackageBaseOptions {
  /**
   * A map of executables to output for this package. The keys in this
   * object should be the filenames of the executable you want to create,
   * and the values should be the source file that will be run. For example,
   * the following object species a `quilt` executable, which will run the
   * `./source/cli.ts` file:
   *
   * ```ts
   * quiltPackage({
   *   executable: {
   *     quilt: './source/cli.ts',
   *   },
   * });
   * ```
   *
   * By default, no executables are built for a package. For more on building
   * executables, see [Quilt’s package build documentation](https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/build.md#executable-files)
   */
  executable?: Record<string, string>;

  /**
   * Whether to build a CommonJS version of this library. This build
   * will be placed in `./build/cjs`; you’ll need to add a `require`
   * export condition to your `package.json` that points at these files
   * for each entry.
   *
   * Instead of a boolean, you can also pass an object with an `exports`
   * field. Passing this value turns on the CommonJS build, and allows you
   * to customize the way in which ES exports from your source files
   * are turned into CommonJS.
   *
   * @default false
   * @see https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/builds.md#commonjs-build
   */
  commonjs?: boolean | {exports?: 'named' | 'default'};
}

export interface PackageOptions extends PackageESModuleOptions {
  /**
   * Whether to build an “ESNext” version of your package. This version
   * will do minimal transpilation, keeping the resulting builds extremely
   * close to your source code. Quilt apps and services that depend on your
   * package will then re-compile the ESNext outputs to match the language
   * features in the runtime environment they are targeting.
   *
   * @default true
   * @see https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/builds.md#esnext-build
   */
  esnext?: boolean;
}

export async function quiltPackage({
  root: rootPath = process.cwd(),
  commonjs = false,
  esnext: explicitESNext,
  entries,
  executable,
  bundle,
  graphql = true,
  customize,
}: PackageOptions = {}) {
  const root = resolveRoot(rootPath);
  const packageJSON = await loadPackageJSON(root);
  const resolvedEntries =
    entries ?? (await sourceEntriesForPackage(root, packageJSON));

  const includeESNext =
    explicitESNext ?? Object.keys(resolvedEntries).length > 0;

  const [esm, esnext] = await Promise.all([
    quiltPackageESModules({
      root,
      graphql,
      entries: resolvedEntries,
      executable,
      bundle,
      commonjs,
      customize,
    }),
    includeESNext
      ? quiltPackageESNext({
          root,
          graphql,
          entries: resolvedEntries,
          bundle,
          customize,
        })
      : Promise.resolve(undefined),
  ]);

  return esnext ? [esm, esnext] : [esm];
}

export async function quiltPackageESModules({
  root: rootPath = process.cwd(),
  commonjs = false,
  entries,
  executable = {},
  bundle,
  graphql = true,
  customize,
}: PackageESModuleOptions = {}) {
  const root = resolveRoot(rootPath);
  const outputDirectory = path.resolve(root, 'build/esm');
  const hasExecutables = Object.keys(executable).length > 0;

  const [{sourceCode}, nodePlugins, packageJSON] = await Promise.all([
    import('./features/source-code.ts'),
    getNodePlugins({bundle}),
    loadPackageJSON(root),
  ]);

  const resolvedEntries =
    entries ?? (await sourceEntriesForPackage(root, packageJSON));
  const hasEntries = Object.keys(resolvedEntries).length > 0;

  const source = sourceForEntries({...resolvedEntries, ...executable}, {root});

  const plugins: Plugin[] = [
    ...nodePlugins,
    sourceCode({mode: 'production'}),
    removeBuildFiles(
      [
        'build/esm',
        ...(commonjs ? ['build/cjs'] : []),
        ...(hasExecutables ? ['bin'] : []),
      ],
      {root},
    ),
  ];

  if (hasExecutables) {
    plugins.push(packageExecutables(executable, {root}));
  }

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  const output: OutputOptions[] = [
    {
      format: 'esm',
      dir: outputDirectory,
      entryFileNames: `[name].mjs`,
      assetFileNames: `[name].[ext]`,
      // We only want to preserve the original directory structure if there
      // are actual package entries.
      ...(hasEntries
        ? {
            preserveModules: true,
            preserveModulesRoot: source.root,
          }
        : {}),
    },
  ];

  if (commonjs) {
    output.push({
      format: 'commonjs',
      dir: path.resolve(outputDirectory, '../cjs'),
      entryFileNames: `[name].cjs`,
      assetFileNames: `[name].[ext]`,
      preserveModules: true,
      preserveModulesRoot: source.root,
    });
  }

  const options = {
    input: source.files,
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
    output,
  } satisfies RollupOptions;

  if (customize) {
    if (typeof customize === 'function') {
      return await customize(options);
    } else {
      const customizedPlugins = await customize.plugins;

      return {
        ...options,
        ...customize,
        plugins: [
          ...options.plugins,
          ...(Array.isArray(customizedPlugins)
            ? customizedPlugins
            : [customizedPlugins]),
        ],
      };
    }
  } else {
    return options;
  }
}

/**
 * Creates a special `esnext` build that is a minimally-processed version
 * of your original source code, preserving native ESModules. This build is
 * ideal for consumers, as it can be processed to transpile only what is
 * needed for the consumer’s target. This will be output in an `esnext`
 * subdirectory of your default build directory. To have consumers prefer
 * this build, make sure that your package.json lists the `quilt:esnext`
 * export condition first for all your export declarations:
 *
 * ```json
 * {
 *   "exports": {
 *     ".": {
 *       "quilt:esnext": "./build/esnext/index.esnext",
 *       "import": "./build/esm/index.mjs"
 *     }
 *   }
 * }
 * ```
 */
export async function quiltPackageESNext({
  root: rootPath = process.cwd(),
  graphql = true,
  entries,
  bundle,
  customize,
}: PackageBaseOptions = {}) {
  const root = resolveRoot(rootPath);
  const outputDirectory = path.join(root, 'build/esnext');

  const [{sourceCode}, nodePlugins, packageJSON] = await Promise.all([
    import('./features/source-code.ts'),
    getNodePlugins({bundle}),
    loadPackageJSON(root),
  ]);

  const resolvedEntries =
    entries ?? (await sourceEntriesForPackage(root, packageJSON));

  const source = sourceForEntries(resolvedEntries, {root});

  const plugins: Plugin[] = [
    ...nodePlugins,
    sourceCode({mode: 'production', babel: false}),
    removeBuildFiles(['build/esnext'], {root}),
  ];

  if (graphql) {
    const {graphql} = await import('./features/graphql.ts');
    plugins.push(graphql({manifest: false}));
  }

  const options = {
    input: source.files,
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
      preserveModules: true,
      preserveModulesRoot: source.root,
      format: 'esm',
      dir: outputDirectory,
      entryFileNames: `[name].esnext`,
      assetFileNames: `[name].[ext]`,
    },
  } satisfies RollupOptions;

  if (customize) {
    if (typeof customize === 'function') {
      return await customize(options);
    } else {
      const customizedPlugins = await customize.plugins;

      return {
        ...options,
        ...customize,
        plugins: [
          ...options.plugins,
          ...(Array.isArray(customizedPlugins)
            ? customizedPlugins
            : [customizedPlugins]),
        ],
      };
    }
  } else {
    return options;
  }
}

const exec = promisify(execCommand);

export function packageExecutables(
  executables: Record<string, string>,
  {root, nodeOptions = []}: {root: string; nodeOptions?: readonly string[]},
) {
  return {
    name: '@quilted/package-executables',
    async generateBundle() {
      await Promise.all(
        Object.entries(executables).map(async ([name, source]) => {
          await writeExecutable(name, source);
        }),
      );
    },
  } satisfies Plugin;

  async function writeExecutable(name: string, source: string) {
    const sourceExtension = path.extname(source);
    let buildFileForSource = source.replace('source', 'build/esm');
    buildFileForSource = path.join(
      path.dirname(buildFileForSource),
      `${path.basename(buildFileForSource, sourceExtension)}.mjs`,
    );

    const executableFile = path.resolve(
      root,
      'bin',
      // Node needs a .mjs extension to parse the file as ESM
      name.endsWith('.mjs') ? name : `${name}.mjs`,
    );

    const relativeFromExecutable = normalizedRelative(
      path.dirname(executableFile),
      path.resolve(root, buildFileForSource),
    );

    // Cross-platform node options override borrowed from
    // https://github.com/cloudflare/miniflare/blob/master/packages/miniflare/bootstrap.js#L29-L47
    const executableContent =
      nodeOptions.length > 0
        ? multiline`
          #!/usr/bin/env node
  
          import {spawn} from 'child_process';
          import {fileURLToPath} from 'url';
          import {dirname, resolve} from 'path';
  
          const executableFile = resolve(
            dirname(fileURLToPath(import.meta.url)),
            ${JSON.stringify(relativeFromExecutable)},
          );
  
          spawn(
            process.execPath,
            [
          ${nodeOptions
            .map((option) => `    ${JSON.stringify(option)},`)
            .join('\n')}
              ...process.execArgv,
              executableFile,
              ...process.argv.slice(2),
            ],
            {stdio: 'inherit'},
          ).on('exit', (code) => {
            process.exit(code == null ? 1 : code);
          });
        `
        : multiline`
          #!/usr/bin/env node
          import ${JSON.stringify(relativeFromExecutable)};
        `;

    await fs.mkdir(path.dirname(executableFile), {recursive: true});
    await fs.writeFile(executableFile, executableContent, 'utf8');
    await exec(`chmod +x ${executableFile}`);
  }
}

function normalizedRelative(from: string, to: string) {
  const rel = path.relative(from, to);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function sourceForEntries(
  entries: Record<string, string>,
  {root}: {root: string},
) {
  let sourceRoot = root;

  const sourceEntryFiles = Object.values(entries);

  for (const entry of sourceEntryFiles) {
    if (!entry.startsWith(root)) continue;

    sourceRoot = path.resolve(
      root,
      path.relative(root, entry).split(path.sep)[0] ?? '.',
    );
    break;
  }

  return {root: sourceRoot, files: sourceEntryFiles};
}

async function sourceEntriesForPackage(root: string, packageJSON: PackageJSON) {
  const {main, exports} = packageJSON;

  const entries: Record<string, string> = {};

  if (typeof main === 'string') {
    entries['.'] = await resolveTargetFileAsSource(main, root);
  }

  if (typeof exports === 'string') {
    entries['.'] = await resolveTargetFileAsSource(exports, root);
    return entries;
  } else if (exports == null || typeof exports !== 'object') {
    return entries;
  }

  for (const [exportPath, exportCondition] of Object.entries(
    exports as Record<string, null | string | Record<string, string>>,
  )) {
    let targetFile: string | null | undefined = null;

    if (exportCondition == null) continue;

    if (typeof exportCondition === 'string') {
      targetFile = exportCondition;
    } else {
      targetFile ??=
        exportCondition['source'] ??
        exportCondition['quilt:source'] ??
        exportCondition['quilt:esnext'] ??
        Object.values(exportCondition).find(
          (condition) =>
            typeof condition === 'string' && condition.startsWith('./build/'),
        );
    }

    if (targetFile == null) continue;

    const sourceFile = await resolveTargetFileAsSource(targetFile, root);

    entries[exportPath] = sourceFile;
  }

  return entries;
}

async function resolveTargetFileAsSource(file: string, root: string) {
  const sourceFile = file.includes('/build/')
    ? (
        await glob(
          file
            .replace(/[/]build[/][^/]+[/]/, '/*/')
            .replace(/(\.d\.ts|\.[\w]+)$/, '.*'),
          {
            cwd: root,
            absolute: true,
            ignore: [path.resolve(root, file)],
          },
        )
      )[0]!
    : path.resolve(root, file);

  return sourceFile;
}

function resolveRoot(root: string | URL) {
  return typeof root === 'string' ? root : fileURLToPath(root);
}