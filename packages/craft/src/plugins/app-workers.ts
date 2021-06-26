import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';

import type {} from '@quilted/workers/sewing-kit';

export const STEP_NAME = 'Quilt.AppWorkers';

export function appWorkers({baseUrl}: {baseUrl: string}) {
  return createProjectPlugin<App>({
    name: STEP_NAME,
    develop({project, configure}) {
      configure((configuration) => {
        const {
          quiltWorkerRollupPlugins,
          quiltWorkerRollupPublicPath,
          quiltWorkerRollupOutputOptions,
          quiltWorkerWrite,
        } = configuration;

        // Use Vite’s ability to read from the file system to serve
        // the built worker assets.
        quiltWorkerWrite?.(() => true);

        quiltWorkerRollupOutputOptions?.((options) => {
          options.dir = project.fs.resolvePath('vite/workers');
          return options;
        });

        quiltWorkerRollupPublicPath?.(
          () => `/@fs${project.fs.buildPath('vite/workers/')}`,
        );

        quiltWorkerRollupPlugins?.(async (plugins) => {
          const [{default: esbuild}, {getRollupNodePlugins}] =
            await Promise.all([
              import('rollup-plugin-esbuild'),
              import('@quilted/sewing-kit-rollup'),
            ]);

          const nodePlugins = await getRollupNodePlugins(
            project,
            configuration,
          );

          plugins.unshift(...nodePlugins);
          plugins.push(
            esbuild({target: 'es2017'}),
            esbuild({
              include: /\.esnext$/,
              exclude: [],
              target: 'es2017',
              loaders: {
                '.esnext': 'js',
              },
            }),
          );

          return plugins;
        });
      });
    },
    build({project, configure}) {
      configure((configuration) => {
        const {
          extensions,
          babelPresets,
          babelPlugins,
          babelTargets,
          babelExtensions,
          quiltWorkerRollupPlugins,
          quiltWorkerRollupPublicPath,
          quiltWorkerRollupOutputOptions,
        } = configuration;

        quiltWorkerRollupOutputOptions?.((options) => {
          options.dir = project.fs.buildPath('assets');
          return options;
        });

        quiltWorkerRollupPublicPath?.(() => baseUrl);

        quiltWorkerRollupPlugins?.(async (plugins) => {
          const [
            {babel},
            {getRollupNodePlugins},
            targets,
            baseExtensions,
            babelPresetsOption,
            babelPluginsOption,
          ] = await Promise.all([
            import('@rollup/plugin-babel'),
            import('@quilted/sewing-kit-rollup'),
            babelTargets!.run([]),
            extensions.run(['.mjs', '.cjs', '.js']),
            babelPresets!.run([]),
            babelPlugins!.run([]),
          ]);

          const finalExtensions = await babelExtensions!.run(baseExtensions);

          const nodePlugins = await getRollupNodePlugins(
            project,
            configuration,
          );

          plugins.unshift(...nodePlugins);

          plugins.push(
            babel({
              envName: 'production',
              extensions: finalExtensions,
              exclude: 'node_modules/**',
              babelHelpers: 'bundled',
              configFile: false,
              babelrc: false,
              skipPreflightCheck: true,
              // @ts-expect-error Babel types have not been updated yet
              targets,
              presets: babelPresetsOption,
              plugins: babelPluginsOption,
            }),
            babel({
              envName: 'production',
              extensions: ['.esnext'],
              include: /\.esnext$/,
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
          );

          return plugins;
        });
      });
    },
  });
}
