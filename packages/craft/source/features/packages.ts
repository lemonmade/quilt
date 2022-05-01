import {join, relative, extname, dirname, sep as pathSeparator} from 'path';

import type {OutputOptions} from 'rollup';

import {createProjectPlugin} from '../kit';
import type {Package, PackageBinary, WaterfallHook} from '../kit';

import type {} from '../tools/rollup';

export type PackageModuleType = 'commonjs' | 'esmodules';

export interface PackageHooks {
  packageBinaryNodeOptions: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildPackageOptions {
    /**
     * Controls the output format and transpilation settings of the
     * build.
     */
    packageBuildModule: PackageModuleType;
  }

  interface BuildPackageConfigurationHooks extends PackageHooks {}
}

export interface Options {
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
   */
  commonjs?: boolean | {exports?: 'named' | 'default'};
}

const ESM_EXTENSION = '.mjs';
const COMMONJS_EXTENSION = '.cjs';

/**
 * Creates build steps that generate package outputs that are appropriate
 * for a public package. By default, this includes one output: an `esm`
 * build that compiles your library to your supported output targets,
 * preserving native ESModules in your code. You can optionally pass
 * `commonjs: true` to build a second version of your library that natively
 * supports `commonjs`.
 */
export function packageBuild({commonjs = true}: Options = {}) {
  return createProjectPlugin<Package>({
    name: 'SewingKit.PackageBuild',
    build({project, configure, run, hooks}) {
      hooks<PackageHooks>(({waterfall}) => ({
        packageBinaryNodeOptions: waterfall(),
      }));

      if (project.packageJson?.private) return;

      configure(
        (
          {outputDirectory, rollupInput, rollupOutputs, rollupPlugins},
          {packageBuildModule},
        ) => {
          if (packageBuildModule == null) return;

          outputDirectory?.((directory) =>
            join(directory, packageBuildModule === 'commonjs' ? 'cjs' : 'esm'),
          );

          rollupInput?.(() => getEntryFiles(project));

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

            // When we are building a binary-only package, we default
            // to bundling the entire project into as few files as possible.
            // When the project is imported normally, we preserve the original
            // source structure.
            const preserveModules = project.entries.length > 0;
            const preserveOptions: Partial<OutputOptions> = preserveModules
              ? {
                  preserveModules: true,
                  preserveModulesRoot: sourceRoot(project),
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
            name: 'SewingKit.PackageBuild.ESModules',
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
              name: 'SewingKit.PackageBuild.CommonJS',
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

        if (project.binaries.length > 0) {
          steps.push(
            step({
              name: 'SewingKit.PackageBuild.Binaries',
              label: `Building binaries for ${project.name}`,
              async run(step) {
                const {outputDirectory, packageBinaryNodeOptions} =
                  await configuration({
                    packageBuildModule: 'esmodules',
                  });

                const [resolvedOutputDirectory, nodeOptions] =
                  await Promise.all([
                    outputDirectory.run(project.fs.buildPath()),
                    packageBinaryNodeOptions!.run([
                      // Try to normalize more places where you can use ESModules
                      '--experimental-vm-modules',
                    ]),
                  ]);

                await Promise.all(
                  project.binaries.map((binary) => writeBinary(binary)),
                );

                async function writeBinary({
                  name,
                  source,
                  aliases,
                }: PackageBinary) {
                  const relativeFromSourceRoot = relative(
                    sourceRoot(project),
                    project.fs.resolvePath(source),
                  );

                  const destinationInOutput = project.fs.resolvePath(
                    resolvedOutputDirectory,
                    relativeFromSourceRoot,
                  );

                  for (const binaryName of [name, ...aliases]) {
                    const binaryFile = project.fs.resolvePath(
                      'bin',
                      // Node needs a .mjs extension to parse the file as ESM
                      `${binaryName}.mjs`,
                    );

                    const originalExtension = extname(source);

                    const relativeFromBinary = normalizedRelative(
                      dirname(binaryFile),
                      `${
                        originalExtension
                          ? destinationInOutput.replace(/\.\w+$/, '')
                          : destinationInOutput
                      }${ESM_EXTENSION}`,
                    );

                    await project.fs.write(
                      binaryFile,
                      [
                        `#!/usr/bin/env -S node${
                          nodeOptions.length > 0
                            ? ` ${nodeOptions.join(' ')}`
                            : ''
                        }`,
                        `import ${JSON.stringify(relativeFromBinary)};`,
                      ].join('\n'),
                    );

                    await step.exec('chmod', ['+x', binaryFile]);
                  }
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

function getEntryFiles({fs, entries, binaries}: Package) {
  return [
    ...entries.map((entry) => fs.resolvePath(entry.source)),
    ...binaries.map((binary) => fs.resolvePath(binary.source)),
  ];
}

function sourceRoot(pkg: Package) {
  const entries = getEntryFiles(pkg);

  if (entries.length === 0) {
    throw new Error(`No entries for package: ${pkg.name}`);
  }

  if (entries.length === 1) {
    return dirname(entries[0]!);
  }

  const [firstEntry, ...otherEntries] = entries;
  let sharedRoot = pkg.fs.root + pathSeparator;

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
