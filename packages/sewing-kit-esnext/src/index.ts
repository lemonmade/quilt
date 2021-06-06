import {join} from 'path';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {Package} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-rollup';

export const EXPORT_CONDITION = 'sewing-kit:esnext';

declare module '@quilted/sewing-kit' {
  interface BuildProjectOptions {
    /**
     * Indicates that the `esnext` build is being generated.
     */
    esnext: true;
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
        (
          {outputDirectory, rollupInput, rollupOutputs},
          {options: {esnext = false}},
        ) => {
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
                // Forces this to run on node_modules
                exclude: [],
                babelHelpers: 'bundled',
                configFile: false,
                babelrc: false,
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
