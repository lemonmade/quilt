import {createComposedProjectPlugin} from '@sewing-kit/plugins';
import {} from '@sewing-kit/plugin-webpack';
import {} from '@sewing-kit/plugin-babel';

const PLUGIN = 'Quilt.WebWorkers';

export interface Options {}

export function useWebWorkers(_options?: Options) {
  return createComposedProjectPlugin(PLUGIN, async (composer) => {
    await Promise.all([
      (async () => {
        try {
          const [{addWebpackPlugin}, {WebWorkerPlugin}] = await Promise.all([
            import('@sewing-kit/plugin-webpack'),
            import('./webpack-parts'),
          ] as const);

          composer.use(addWebpackPlugin(new WebWorkerPlugin()));
        } catch {
          // intentional noop
        }
      })(),
      (async () => {
        try {
          const {addBabelPlugin} = await import('@sewing-kit/plugin-babel');
          composer.use(addBabelPlugin(require.resolve('./babel-plugin')));
        } catch {
          // intentional noop
        }
      })(),
    ]);
  });
}
