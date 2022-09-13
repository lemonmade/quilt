import {join, relative, extname, dirname, sep as pathSeparator} from 'path';

import {stripIndent} from 'common-tags';
import type {OutputOptions} from 'rollup';

import {createProjectPlugin} from '../kit';
import type {Project, WaterfallHook, WaterfallHookWithDefault} from '../kit';

import type {} from '../tools/rollup';

export type PackageModuleType = 'commonjs' | 'esmodules';

export interface PackageHooks {
  packageEntries: WaterfallHookWithDefault<Record<string, string>>;
  packageExecutables: WaterfallHookWithDefault<Record<string, string>>;
  packageExecutableNodeOptions: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Controls the output format and transpilation settings of the
     * build.
     */
    packageBuildModule: PackageModuleType;
  }

  interface BuildProjectConfigurationHooks extends PackageHooks {}
  interface DevelopProjectConfigurationHooks extends PackageHooks {}
}

const ESM_EXTENSION = '.mjs';
const COMMONJS_EXTENSION = '.cjs';

export interface Options {
  /**
   * A map of package entry to source file name. The keys in this
   * object should be in the same format as the keys for the `exports`
   * property in the package.json file. For example, the following object
   * species a "root" entry point
   *
   * ```ts
   * createPackage({
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
   * A map of executables to output for this package. The keys in this
   * object should be the filenames of the executable you want to create,
   * and the values should be the source file that will be run. For example,
   * the following object species a `quilt` executable, which will run the
   * `./source/cli.ts` file:
   *
   * ```ts
   * createPackage({
   *   binaries: {
   *     quilt: './source/cli.ts',
   *   },
   * });
   * ```
   *
   * By default, no executables are built for a package. For more on building
   * executables, see [Quilt’s package build documentation](https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/build.md#executable-files)
   */
  executable?: Record<string, string>;
}

export function packageBase({entries, executable = {}}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Package',
    build({project, configure, hooks}) {
      const getEntries = createCachedSourceEntriesGetter(project, entries);

      hooks<PackageHooks>(({waterfall}) => ({
        packageEntries: waterfall({
          default: getEntries,
        }),
        packageExecutables: waterfall({
          default: () => executable,
        }),
        packageExecutableNodeOptions: waterfall(),
      }));

      configure(({babelRuntimeHelpers}) => {
        babelRuntimeHelpers?.(() => 'runtime');
      });
    },
    develop({project, configure, hooks}) {
      const getEntries = createCachedSourceEntriesGetter(project, entries);

      hooks<PackageHooks>(({waterfall}) => ({
        packageEntries: waterfall({
          default: getEntries,
        }),
        packageExecutables: waterfall({
          default: () => executable,
        }),
        packageExecutableNodeOptions: waterfall(),
      }));

      configure(({babelRuntimeHelpers}) => {
        babelRuntimeHelpers?.(() => 'runtime');
      });
    },
  });
}

function createCachedSourceEntriesGetter(
  project: Project,
  defaultEntries?: Record<string, string>,
): () => Promise<Record<string, string>> {
  if (defaultEntries != null) return () => Promise.resolve({...defaultEntries});

  let cached: Promise<Record<string, string>> | undefined;

  return () => {
    if (cached == null) {
      cached = sourceEntriesForProject(project);
    }

    return cached;
  };
}

export async function sourceEntriesForProject(
  project: Project,
  {conditions = []}: {conditions?: string[]} = {},
) {
  const entries: Record<string, string> = {};

  for (const [exportPath, exportCondition] of Object.entries(
    (project.packageJson?.raw.exports ?? {}) as Record<
      string,
      null | string | Record<string, string>
    >,
  )) {
    let targetFile: string | null | undefined = null;

    if (exportCondition == null) continue;

    if (typeof exportCondition === 'string') {
      targetFile = exportCondition;
    } else {
      if (conditions.length > 0) {
        for (const [condition, conditionValue] of Object.entries(
          exportCondition,
        )) {
          if (!conditions.includes(condition)) continue;
          if (conditionValue == null || typeof conditionValue !== 'object') {
            continue;
          }

          const sourceForCondition = conditionValue['quilt:source'];

          if (sourceForCondition != null) {
            targetFile = sourceForCondition;
            break;
          }
        }
      }

      targetFile ??=
        exportCondition['quilt:source'] ??
        exportCondition['quilt:esnext'] ??
        Object.values(exportCondition).find(
          (condition) =>
            typeof condition === 'string' && condition.startsWith('./build/'),
        );
    }

    if (targetFile == null) continue;

    const sourceFile = targetFile.includes('/build/')
      ? (
          await project.fs.glob(
            targetFile
              .replace(/[/]build[/][^/]+[/]/, '/*/')
              .replace(/(\.d\.ts|\.[\w]+)$/, '.*'),
            {ignore: [project.fs.resolvePath(targetFile)]},
          )
        )[0]!
      : project.fs.resolvePath(targetFile);

    entries[exportPath] = sourceFile;
  }

  return entries;
}

export interface BuildOptions {
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
   * The default for this options is currently `true`, but it **will**
   * be changed to `false` before release. It’s only `true` right now
   * because Jest’s support for ES modules is not totally ready for
   * prime-time.
   *
   * @default true
   * @see https://github.com/lemonmade/quilt/blob/main/documentation/projects/packages/builds.md#commonjs-build
   */
  commonjs?: boolean | {exports?: 'named' | 'default'};
}

/**
 * Creates build steps that generate package outputs that are appropriate
 * for a public package. By default, this includes one output: an `esm`
 * build that compiles your library to your supported output targets,
 * preserving native ESModules in your code. You can optionally pass
 * `commonjs: true` to build a second version of your library that natively
 * supports `commonjs`.
 */
export function packageBuild({commonjs = true}: BuildOptions = {}) {
  return createProjectPlugin({
    name: 'Quilt.PackageBuild',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        (
          {
            outputDirectory,
            packageEntries,
            packageExecutables,
            rollupInput,
            rollupOutputs,
            rollupPlugins,
            babelPresetEnvOptions,
          },
          {packageBuildModule},
        ) => {
          if (packageBuildModule == null) return;

          babelPresetEnvOptions?.(() => {
            return {
              useBuiltIns: false,
              bugfixes: true,
              shippedProposals: true,
              // I thought I wanted this on, but if you do this, Babel
              // stops respecting the top-level `targets` option and tries
              // to use the targets passed to the preset directly instead.
              // ignoreBrowserslistConfig: true,
            };
          });

          outputDirectory?.((directory) =>
            join(directory, packageBuildModule === 'commonjs' ? 'cjs' : 'esm'),
          );

          rollupInput?.(async () => {
            const [entries, binaries] = await Promise.all([
              packageEntries!.run(),
              packageExecutables!.run(),
            ]);

            return [
              ...Object.values(entries).map((file) =>
                project.fs.resolvePath(file),
              ),
              ...Object.values(binaries).map((file) =>
                project.fs.resolvePath(file),
              ),
            ];
          });

          rollupPlugins?.(async (plugins) => {
            const extension =
              packageBuildModule === 'commonjs'
                ? COMMONJS_EXTENSION
                : ESM_EXTENSION;

            const {fixCommonJsPreserveModules} = await import(
              '@quilted/rollup-plugin-fix-commonjs-preserve-modules'
            );

            plugins.push(fixCommonJsPreserveModules({extension}));

            return plugins;
          });

          // Creates outputs for the current build type
          rollupOutputs?.(async (outputs) => {
            const dir = await outputDirectory.run(project.fs.buildPath());

            // When we are building a executable-only package, we default
            // to bundling the entire project into as few files as possible.
            // When the project is imported normally, we preserve the original
            // source structure.
            const entries = await packageEntries!.run();
            const rollupInputs = await rollupInput!.run([]);
            const preserveModules = Object.keys(entries).length > 0;
            const preserveOptions: Partial<OutputOptions> = preserveModules
              ? {
                  preserveModules: true,
                  preserveModulesRoot: sourceRoot(project, rollupInputs),
                }
              : {};

            switch (packageBuildModule) {
              case 'commonjs': {
                return [
                  ...outputs,
                  {
                    ...preserveOptions,
                    format: 'commonjs',
                    dir,
                    exports:
                      typeof commonjs === 'object'
                        ? commonjs.exports ?? 'named'
                        : 'named',
                    entryFileNames: preserveModules
                      ? `[name][assetExtname]${COMMONJS_EXTENSION}`
                      : `[name]${COMMONJS_EXTENSION}`,
                    assetFileNames: `[name].[ext]`,
                    chunkFileNames: `[name]${COMMONJS_EXTENSION}`,
                  },
                ];
              }
              case 'esmodules': {
                return [
                  ...outputs,
                  {
                    ...preserveOptions,
                    format: 'esm',
                    dir,
                    entryFileNames: preserveModules
                      ? `[name][assetExtname]${ESM_EXTENSION}`
                      : `[name]${ESM_EXTENSION}`,
                    assetFileNames: `[name].[ext]`,
                    chunkFileNames: `[name]${ESM_EXTENSION}`,
                  },
                ];
              }
            }
          });
        },
      );

      run(async (step, {configuration}) => {
        const steps = [
          step({
            name: 'Quilt.PackageBuild.ESModules',
            label: `Build esmodules output for ${project.name}`,
            async run() {
              const [configure, {buildWithRollup}] = await Promise.all([
                configuration({
                  packageBuildModule: 'esmodules',
                }),
                import('../tools/rollup'),
              ]);

              await buildWithRollup(project, configure);
            },
          }),
        ];

        if (commonjs) {
          steps.push(
            step({
              name: 'Quilt.PackageBuild.CommonJS',
              label: `Build commonjs output for ${project.name}`,
              async run() {
                const [configure, {buildWithRollup}] = await Promise.all([
                  configuration({
                    packageBuildModule: 'commonjs',
                  }),
                  import('../tools/rollup'),
                ]);

                await buildWithRollup(project, configure);
              },
            }),
          );
        }

        const {packageExecutables} = await configuration();
        const executables = await packageExecutables!.run();

        if (Object.keys(executables).length > 0) {
          steps.push(
            step({
              name: 'Quilt.PackageBuild.Executables',
              label: `Building binaries for ${project.name}`,
              async run(step) {
                const {
                  outputDirectory,
                  packageExecutableNodeOptions,
                  rollupInput,
                } = await configuration({
                  packageBuildModule: 'esmodules',
                });

                const [resolvedOutputDirectory, inputs, nodeOptions] =
                  await Promise.all([
                    outputDirectory.run(project.fs.buildPath()),
                    rollupInput!.run([]),
                    packageExecutableNodeOptions!.run([]),
                  ]);

                await Promise.all(
                  Object.entries(executables).map(([name, source]) =>
                    writeExecutable({name, source}),
                  ),
                );

                async function writeExecutable({
                  name,
                  source,
                }: {
                  name: string;
                  source: string;
                }) {
                  const relativeFromSourceRoot = relative(
                    sourceRoot(project, inputs),
                    project.fs.resolvePath(source),
                  );

                  const destinationInOutput = project.fs.resolvePath(
                    resolvedOutputDirectory,
                    relativeFromSourceRoot,
                  );

                  const executableFile = project.fs.resolvePath(
                    'bin',
                    // Node needs a .mjs extension to parse the file as ESM
                    name.endsWith('.mjs') ? name : `${name}.mjs`,
                  );

                  const originalExtension = extname(source);

                  const relativeFromExecutable = normalizedRelative(
                    dirname(executableFile),
                    `${
                      originalExtension
                        ? destinationInOutput.replace(/\.\w+$/, '')
                        : destinationInOutput
                    }${ESM_EXTENSION}`,
                  );

                  // Cross-platform node options override borrowed from
                  // https://github.com/cloudflare/miniflare/blob/master/packages/miniflare/bootstrap.js#L29-L47
                  const executableContent =
                    nodeOptions.length > 0
                      ? stripIndent`
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
                      : stripIndent`
                        #!/usr/bin/env node
                        import ${JSON.stringify(relativeFromExecutable)};
                      `;

                  await project.fs.write(executableFile, executableContent);

                  await step.exec('chmod', ['+x', executableFile]);
                }
              },
            }),
          );
        }

        return steps;
      });
    },
  });
}

function sourceRoot(project: Project, entries: string[]) {
  if (entries.length === 0) {
    return project.fs.root + pathSeparator;
  }

  if (entries.length === 1) {
    return dirname(entries[0]!);
  }

  const [firstEntry, ...denormalizedOtherEntries] = entries;

  const otherEntries = denormalizedOtherEntries.map((entry) =>
    project.fs.resolvePath(entry),
  );

  let sharedRoot = project.fs.root + pathSeparator;

  for (const segment of firstEntry!
    .replace(sharedRoot, '')
    .split(pathSeparator)) {
    const maybeSharedRoot = join(sharedRoot, segment + pathSeparator);

    if (otherEntries.some((entry) => !entry.startsWith(maybeSharedRoot))) break;

    sharedRoot = maybeSharedRoot;
  }

  return sharedRoot;
}

function normalizedRelative(from: string, to: string) {
  const rel = relative(from, to);
  return rel.startsWith('.') ? rel : `./${rel}`;
}
