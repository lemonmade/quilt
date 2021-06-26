import {join, dirname, sep as pathSeparator} from 'path';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {
  Project,
  Package,
  ResolvedHooks,
  DevelopConfigurationHooksForProject,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-rollup';
import type {ViteHooks} from '@quilted/sewing-kit-vite';

export const EXPORT_CONDITION = 'sewing-kit:esnext';

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Indicates that the `esnext` build is being generated.
     */
    esnext: boolean;
  }
}

/**
 * Creates a special `esnext` build that is a minimally-processed version
 * of your original source code, preserving native ESModules. This build is
 * ideal for consumers, as it can be processed to transpile only what is
 * needed for the consumer’s target. This will be output in an `esnext`
 * subdirectory of your default build directory. To have consumers prefer
 * this build, make sure that your package.json lists the `sewing-kit:esnext`
 * export condition first for all your export declarations:
 *
 * ```json
 * {
 *   "exports": {
 *     ".": {
 *       "sewing-kit:esnext": "./build/esnext/index.esnext",
 *       "import": "./build/esm/index.mjs"
 *     }
 *   }
 * }
 * ```
 *
 * Finally, the consumer should also include the `esnext()` plugin from
 * this package in their sewing-kit configuration file:
 *
 * ```ts
 * import {createApp} from '@quilted/sewing-kit';
 * import {esnext} from '@quilted/sewing-kit-esnext';
 *
 * export default createApp((app) => {
 *   app.use(esnext());
 * });
 * ```
 */
export function esnextBuild() {
  return createProjectPlugin<Package>({
    name: 'SewingKit.ESNextBuild',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        ({outputDirectory, rollupInput, rollupOutputs}, {esnext = false}) => {
          if (!esnext) return;

          outputDirectory((output) => join(output, 'esnext'));

          rollupInput?.(() => {
            return Promise.all(
              project.entries.map((entry) =>
                project.fs.resolvePath(entry.source),
              ),
            );
          });

          // Creates the esnext outputs
          rollupOutputs?.(async (outputs) => [
            ...outputs,
            {
              format: 'esm',
              dir: await outputDirectory.run(project.fs.buildPath()),
              preserveModules: true,
              preserveModulesRoot: sourceRoot(project),
              entryFileNames: '[name][assetExtname].esnext',
            },
          ]);
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.ESNextBuild',
          label: `Build esnext output for ${project.name}`,
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({esnext: true}),
              import('@quilted/sewing-kit-rollup'),
            ]);

            // We want to keep the output code as close as possible to source
            // code, so we remove presets that will transpile language features.
            configure.babelPresets?.((presets) => {
              return presets.filter((preset) => {
                const presetName = Array.isArray(preset) ? preset[0] : preset;
                return presetName !== '@babel/preset-env';
              });
            });

            await buildWithRollup(configure);
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
    name: 'SewingKit.ESNextConsumer',
    develop({configure}) {
      configure(
        ({
          vitePlugins,
          viteResolveExportConditions,
          rollupPlugins,
          rollupNodeExportConditions,
        }: ResolvedHooks<
          DevelopConfigurationHooksForProject<Project> & ViteHooks
        >) => {
          // Prefer the esnext export condition
          rollupNodeExportConditions?.((exportConditions) =>
            Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
          );

          // Prefer the esnext export condition
          viteResolveExportConditions?.((exportConditions) =>
            Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
          );

          // Add the ESBuild plugin to process .esnext files like source code
          rollupPlugins?.(async (plugins) => {
            const {default: esbuild} = await import('rollup-plugin-esbuild');

            return [
              ...plugins,
              esbuild({
                include: /\.esnext$/,
                // Forces this to run on node_modules
                exclude: [],
                loaders: {
                  '.esnext': 'jsx',
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
                // Forces this to run on node_modules
                exclude: [],
                loaders: {
                  '.esnext': 'jsx',
                },
              }),
            ];
          });
        },
      );
    },
    build({configure}) {
      configure(
        ({
          babelTargets,
          babelPresets,
          babelPlugins,
          rollupPlugins,
          rollupNodeExportConditions,
        }) => {
          // Prefer the esnext export condition
          rollupNodeExportConditions?.((exportConditions) =>
            Array.from(new Set([EXPORT_CONDITION, ...exportConditions])),
          );

          // Add the Babel plugin to process .esnext files like source code
          rollupPlugins?.(async (plugins) => {
            const [{babel}, targets, babelPresetsOption, babelPluginsOption] =
              await Promise.all([
                import('@rollup/plugin-babel'),
                babelTargets!.run([]),
                babelPresets!.run([]),
                babelPlugins!.run([]),
              ]);

            return [
              ...plugins,
              babel({
                envName: 'production',
                include: '**/*.esnext',
                extensions: ['.esnext'],
                // Forces this to run on node_modules
                exclude: [],
                babelHelpers: 'bundled',
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
