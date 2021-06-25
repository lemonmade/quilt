import {createProjectPlugin} from '@quilted/sewing-kit';
import type {Service} from '@quilted/sewing-kit';

import {getEntry} from './shared';
declare module '@quilted/sewing-kit' {
  interface BuildServiceOptions {
    /**
     * Indicates that the base build is being generated by `quilt`.
     */
    quiltService: boolean;
  }
}

export interface Options {
  minify: boolean;
  httpHandler: boolean;
}

export function serviceBuild({minify, httpHandler}: Options) {
  return createProjectPlugin<Service>({
    name: 'Quilt.Service.Build',
    build({project, configure, run}) {
      configure(
        (
          {outputDirectory, rollupInput, rollupPlugins, rollupOutputs},
          {quiltService = false},
        ) => {
          if (!quiltService) return;

          rollupInput?.(async () => {
            const entry = await getEntry(project);
            return [entry];
          });

          if (minify) {
            rollupPlugins?.(async (plugins) => {
              const {terser} = await import('rollup-plugin-terser');

              plugins.push(terser());

              return plugins;
            });
          }

          rollupOutputs?.(async (outputs) => [
            ...outputs,
            {
              format: 'esm',
              dir: await outputDirectory.run(project.fs.buildPath()),
              entryFileNames: 'index.mjs',
            },
          ]);
        },
      );

      run((step, {configuration}) =>
        step({
          name: 'Quilt.Service.Build',
          label: `Build service ${project.name}`,
          async run() {
            const [configure, {buildWithRollup}] = await Promise.all([
              configuration({
                quiltService: true,
                quiltHttpHandler: httpHandler,
              }),
              import('@quilted/sewing-kit-rollup'),
            ]);

            await buildWithRollup(configure);
          },
        }),
      );
    },
  });
}
