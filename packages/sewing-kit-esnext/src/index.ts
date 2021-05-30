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
    name: 'SewingKit.Babel',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        (
          {outputDirectory, rollupInput, rollupPlugins, rollupOutputs},
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

          // Add the Babel plugin to process source code
          rollupPlugins?.(async (plugins) => {
            const {default: esbuild} = await import('rollup-plugin-esbuild');

            return [...plugins, esbuild({target: 'esnext'})];
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
          name: 'SewingKit.PackageBuild.ESNext',
          label: `Build esnext output for ${project.name}`,
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({esnext: true}),
              import('@quilted/sewing-kit-rollup'),
            ]);

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
  return createProjectPlugin<Package>({
    name: 'SewingKit.Babel',
    build({configure}) {
      configure(
        ({
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
            const [
              {babel},
              babelPresetsOption,
              babelPluginsOption,
            ] = await Promise.all([
              import('@rollup/plugin-babel'),
              babelPresets!.run([['@babel/preset-env']]),
              babelPlugins!.run([]),
            ]);

            return [
              ...plugins,
              babel({
                envName: 'production',
                include: '**/*.esnext',
                exclude: [],
                babelHelpers: 'bundled',
                configFile: false,
                babelrc: false,
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
