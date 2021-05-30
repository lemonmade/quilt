import {
  MissingPluginError,
  Package,
  createProjectPlugin,
} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
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

interface Options {
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
export function packageBuild({commonjs = false}: Options = {}) {
  return createProjectPlugin<Package>({
    name: 'SewingKit.PackageBuild',
    build({project, configure, run}) {
      if (project.packageJson?.private) return;

      configure(
        (
          {
            rollupInput,
            rollupPlugins,
            rollupOutputs,
            babelPresets,
            babelPlugins,
          },
          {options: {packageBuildModule}},
        ) => {
          if (packageBuildModule == null) return;

          if (rollupInput == null) {
            throw new MissingPluginError(
              'rollupHooks',
              '@quilted/sewing-kit-rollup',
            );
          }

          if (babelPresets == null) {
            throw new MissingPluginError(
              'babelHooks',
              '@quilted/sewing-kit-babel',
            );
          }

          rollupInput?.(() => {
            return Promise.all(
              project.entries.map((entry) =>
                project.fs.resolvePath(entry.source),
              ),
            );
          });

          // Add the Babel plugin to process source code
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
                // TODO: add a hook for this, make it computed from a core
                // extensions hook default
                extensions: ['.ts', '.tsx', '.mjs', '.js'],
                envName: 'production',
                exclude: 'node_modules/**',
                babelHelpers: 'bundled',
                configFile: false,
                babelrc: false,
                presets: babelPresetsOption,
                plugins: babelPluginsOption,
              }),
            ];
          });

          // Creates outputs for the current build type
          rollupOutputs?.((outputs) => {
            switch (packageBuildModule) {
              case 'commonjs': {
                return [
                  ...outputs,
                  {
                    format: 'commonjs',
                    dir: project.fs.buildPath('cjs'),
                    preserveModules: true,
                    exports:
                      typeof commonjs === 'object'
                        ? commonjs.exports ?? 'named'
                        : 'named',
                    entryFileNames: '[name][assetExtname].js',
                  },
                ];
              }
              case 'esmodules': {
                return [
                  ...outputs,
                  {
                    format: 'esm',
                    dir: project.fs.buildPath('esm'),
                    preserveModules: true,
                    entryFileNames: '[name][assetExtname].mjs',
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

        return steps;
      });
    },
  });
}
