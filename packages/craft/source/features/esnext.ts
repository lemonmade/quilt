import {createRequire} from 'module';
import {join, dirname, sep as pathSeparator} from 'path';

import {createProjectPlugin} from '../kit';
import type {Project} from '../kit';

import type {} from '../tools/babel';
import type {} from '../tools/rollup';

import {createChunkNamer} from './packages';

export const EXPORT_CONDITION = 'quilt:esnext';
// Some older packages published with use this condition name, so we
// support it too (even though it's a bit dangerous, given how generic
// the name is).
export const LEGACY_EXPORT_CONDITION = 'esnext';

const EXTENSION = '.esnext';

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Indicates that the `esnext` build is being generated.
     */
    esnext: boolean;
  }
}

const require = createRequire(import.meta.url);

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
export function esnextBuild() {
  return createProjectPlugin({
    name: 'Quilt.ESNextBuild',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        (
          {
            outputDirectory,
            packageEntries,
            rollupInput,
            rollupPlugins,
            rollupOutputs,
          },
          {esnext = false},
        ) => {
          if (!esnext) return;

          outputDirectory((output) => join(output, 'esnext'));

          rollupInput?.(async () => {
            const entries = await packageEntries!.run();

            return Object.values(entries).map((file) =>
              project.fs.resolvePath(file),
            );
          });

          rollupPlugins?.(async (plugins) => {
            const {fixCommonJsPreserveModules} = await import(
              '@quilted/rollup-plugin-fix-commonjs-preserve-modules'
            );

            plugins.push(fixCommonJsPreserveModules({extension: EXTENSION}));

            return plugins;
          });

          // Creates the esnext outputs
          rollupOutputs?.(async (outputs) => {
            const sourceRootDirectory = sourceRoot(
              project,
              await rollupInput!.run([]),
            );

            return [
              ...outputs,
              {
                format: 'esm',
                dir: await outputDirectory.run(project.fs.buildPath()),
                preserveModules: true,
                preserveModulesRoot: sourceRootDirectory,
                entryFileNames: `[name][assetExtname]${EXTENSION}`,
                assetFileNames: `[name].[ext]`,
                chunkFileNames: createChunkNamer({
                  extension: EXTENSION,
                  sourceRoot: sourceRootDirectory,
                }),
              },
            ];
          });
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.ESNextBuild',
          label: `Build esnext output for ${project.name}`,
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({esnext: true}),
              import('../tools/rollup'),
            ]);

            // We want to keep the output code as close as possible to source
            // code, so we remove presets that will transpile language features.
            configure.babelPresets?.((presets) => {
              return presets.filter((preset) => {
                const presetName = Array.isArray(preset) ? preset[0] : preset;
                return (
                  typeof presetName !== 'string' ||
                  !presetName.includes('@babel/preset-env')
                );
              });
            });

            await buildWithRollup(project, configure);
          },
        }),
      );
    },
  });
}

/**
 * Adds configuration to various tools to prefer the `esnext` build
 * for Node.js dependencies.
 */
export function esnext() {
  return createProjectPlugin({
    name: 'Quilt.ESNextConsumer',
    develop({configure}) {
      configure(({vitePlugins, rollupPlugins, rollupNodeExportConditions}) => {
        // Prefer the esnext export condition
        rollupNodeExportConditions?.((exportConditions) =>
          Array.from(
            new Set([
              EXPORT_CONDITION,
              LEGACY_EXPORT_CONDITION,
              ...exportConditions,
            ]),
          ),
        );

        // Vite has an issue where it passes an invalid `loader` to esbuild
        // when the entrypoint to a project is a .esnext file. I should open
        // an issue for this...
        // viteResolveExportConditions?.((exportConditions) =>
        //   Array.from(
        //     new Set([
        //       EXPORT_CONDITION,
        //       LEGACY_EXPORT_CONDITION,
        //       ...exportConditions,
        //     ]),
        //   ),
        // );

        // Add the ESBuild plugin to process .esnext files like source code
        rollupPlugins?.(async (plugins) => {
          const {default: esbuild} = await import('rollup-plugin-esbuild');

          return [
            ...plugins,
            esbuild({
              include: /\.esnext$/,
              // Support very modern features
              target: 'es2020',
              // Forces this to run on node_modules
              exclude: [],
              loaders: {
                [EXTENSION]: 'js',
              },
            }),
          ];
        });

        vitePlugins?.(async (plugins) => {
          const {default: esbuild} = await import('rollup-plugin-esbuild');

          return [
            ...plugins,
            esbuild({
              include: /\.esnext$/,
              // Support very modern features
              target: 'es2020',
              // Forces this to run on node_modules
              exclude: [],
              loaders: {
                [EXTENSION]: 'jsx',
              },
            }),
          ];
        });
      });
    },
    build({configure}) {
      configure(
        ({
          babelTargets,
          babelPresets,
          babelPlugins,
          babelRuntimeHelpers,
          rollupPlugins,
          rollupNodeExportConditions,
        }) => {
          // Prefer the esnext export condition
          rollupNodeExportConditions?.((exportConditions) =>
            Array.from(
              new Set([
                EXPORT_CONDITION,
                LEGACY_EXPORT_CONDITION,
                ...exportConditions,
              ]),
            ),
          );

          // Add the Babel plugin to process .esnext files like source code
          rollupPlugins?.(async (plugins) => {
            const helpers =
              (await babelRuntimeHelpers?.run('runtime')) ?? 'runtime';

            const [{babel}, targets, babelPresetsOption, babelPluginsOption] =
              await Promise.all([
                import('@rollup/plugin-babel'),
                babelTargets!.run([]),
                babelPresets!.run([]),
                babelPlugins!.run(
                  helpers === 'runtime'
                    ? [require.resolve('@babel/plugin-transform-runtime')]
                    : [],
                ),
              ]);

            return [
              ...plugins,
              babel({
                envName: 'production',
                include: '**/*.esnext',
                extensions: [EXTENSION],
                // Forces this to run on node_modules
                exclude: [],
                babelHelpers: helpers,
                configFile: false,
                babelrc: false,
                skipPreflightCheck: true,
                // @ts-expect-error Babel types have not been updated yet
                targets,
                presets: babelPresetsOption,
                plugins: babelPluginsOption,
              }),
            ];
          });
        },
      );
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
