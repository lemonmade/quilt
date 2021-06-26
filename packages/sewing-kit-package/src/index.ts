import {join, relative, extname, dirname, sep as pathSeparator} from 'path';
import {MissingPluginError, createProjectPlugin} from '@quilted/sewing-kit';
import type {Package, PackageBinary} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-rollup';

export type PackageModuleType = 'commonjs' | 'esmodules';

declare module '@quilted/sewing-kit' {
  interface BuildPackageOptions {
    /**
     * Controls the output format and transpilation settings of the
     * build.
     */
    packageBuildModule: PackageModuleType;
  }
}

export interface Options {
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
export function packageBuild({commonjs = false}: Options = {}) {
  return createProjectPlugin<Package>({
    name: 'SewingKit.PackageBuild',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        (
          {outputDirectory, rollupInput, rollupOutputs},
          {packageBuildModule},
        ) => {
          if (packageBuildModule == null) return;

          if (rollupInput == null) {
            throw new MissingPluginError(
              'rollupHooks',
              '@quilted/sewing-kit-rollup',
            );
          }

          outputDirectory?.((directory) =>
            join(directory, packageBuildModule === 'commonjs' ? 'cjs' : 'esm'),
          );

          rollupInput?.(() => getEntryFiles(project));

          // Creates outputs for the current build type
          rollupOutputs?.(async (outputs) => {
            const dir = await outputDirectory.run(project.fs.buildPath());

            switch (packageBuildModule) {
              case 'commonjs': {
                return [
                  ...outputs,
                  {
                    format: 'commonjs',
                    dir,
                    preserveModules: true,
                    preserveModulesRoot: sourceRoot(project),
                    exports:
                      typeof commonjs === 'object'
                        ? commonjs.exports ?? 'named'
                        : 'named',
                    entryFileNames: `[name][assetExtname]${COMMONJS_EXTENSION}`,
                    assetFileNames: `[name].[ext]`,
                    chunkFileNames: `[name]${COMMONJS_EXTENSION}`,
                  },
                ];
              }
              case 'esmodules': {
                return [
                  ...outputs,
                  {
                    format: 'esm',
                    dir,
                    preserveModules: true,
                    preserveModulesRoot: sourceRoot(project),
                    entryFileNames: `[name][assetExtname]${ESM_EXTENSION}`,
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
                import('@quilted/sewing-kit-rollup'),
              ]);

              await buildWithRollup(configure);
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
                  import('@quilted/sewing-kit-rollup'),
                ]);

                await buildWithRollup(configure);
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
                const {outputDirectory} = await configuration({
                  packageBuildModule: 'esmodules',
                });

                const resolvedOutputDirectory = await outputDirectory.run(
                  project.fs.buildPath(),
                );

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
                        `#!/usr/bin/env node`,
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
    return dirname(entries[0]);
  }

  const [firstEntry, ...otherEntries] = entries;
  let sharedRoot = pkg.fs.root + pathSeparator;

  for (const segment of firstEntry
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
