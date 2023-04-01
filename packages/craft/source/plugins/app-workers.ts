import {createProjectPlugin} from '../kit.ts';

import type {} from '../features/workers.ts';

export const STEP_NAME = 'Quilt.AppWorkers';

export function appWorkers({baseUrl}: {baseUrl: string}) {
  return createProjectPlugin({
    name: STEP_NAME,
    develop({project, workspace, configure}) {
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
          options.dir = project.fs.temporaryPath('vite/workers');
          return options;
        });

        quiltWorkerRollupPublicPath?.(
          () => `/@fs${project.fs.temporaryPath('vite/workers/')}`,
        );

        // Vite does not call the `option` hook properly, so we don’t get
        // all the plugins from the parent build available in the child.
        // This adds all the main plugins back.
        quiltWorkerRollupPlugins?.(async (plugins) => {
          const [{default: esbuild}, {getRollupNodePlugins}] =
            await Promise.all([
              import('rollup-plugin-esbuild'),
              import('../tools/rollup.ts'),
            ]);

          const nodePlugins = await getRollupNodePlugins(
            project,
            workspace,
            configuration,
          );

          return [
            ...nodePlugins.filter((plugin) => plugin.name !== 'node-externals'),
            ...plugins,
            esbuild({target: 'es2020'}),
            esbuild({
              include: /\.esnext$/,
              exclude: [],
              target: 'es2020',
              loaders: {
                '.esnext': 'js',
              },
            }),
          ];
        });
      });
    },
    build({project, configure}) {
      configure((configuration, options) => {
        const {quiltWorkerRollupPublicPath, quiltWorkerRollupOutputOptions} =
          configuration;

        quiltWorkerRollupOutputOptions?.((outputOptions) => {
          const browserTargets = options.quiltAppBrowser;
          const targetFilenamePart = browserTargets
            ? `.${browserTargets.name}`
            : '';

          outputOptions.dir = project.fs.buildPath('assets');
          outputOptions.entryFileNames = `[name]${targetFilenamePart}.[hash].js`;
          outputOptions.assetFileNames = `[name]${targetFilenamePart}.[hash].[ext]`;
          outputOptions.chunkFileNames = `[name]${targetFilenamePart}.[hash].js`;

          return outputOptions;
        });

        quiltWorkerRollupPublicPath?.(() => baseUrl);
      });
    },
  });
}
