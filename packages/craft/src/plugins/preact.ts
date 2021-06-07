import {createProjectPlugin} from '@quilted/sewing-kit';

export function preact() {
  return createProjectPlugin({
    name: 'Quilt.Preact',
    build({configure}) {
      configure(({rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const {default: alias} = await import('@rollup/plugin-alias');

          plugins.push(
            alias({
              entries: {
                'react/jsx-runtime': 'preact/jsx-runtime',
                react: '@quilted/preact-mini-compat',
                'react-dom/server': 'preact/compat/server',
                'react-dom': '@quilted/preact-mini-compat',
                'preact/jsx-dev-runtime': 'preact/jsx-runtime',
              },
            }),
          );

          return plugins;
        });
      });
    },
  });
}
