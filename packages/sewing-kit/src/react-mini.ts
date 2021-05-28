import {createProjectPlugin} from '@sewing-kit/plugins';
import {updateBabelPreset} from '@sewing-kit/plugin-javascript';

import type {} from '@sewing-kit/plugin-rollup';

export function react({library = 'preact'} = {}) {
  return createProjectPlugin('Quilt.ReactJsxRuntime', ({tasks}) => {
    const addReactBabelPreset = updateBabelPreset(
      ['@babel/preset-react'],
      {
        runtime: 'automatic',
        importSource: library,
      },
      {addIfMissing: true},
    );

    tasks.build.hook(({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(({babelConfig, rollupPlugins}) => {
          babelConfig?.hook(addReactBabelPreset);

          if (library === 'preact') {
            rollupPlugins?.hook(async (plugins) => {
              const {default: alias} = await import('@rollup/plugin-alias');

              return [
                alias({
                  entries: {
                    'react/jsx-runtime': 'preact/jsx-runtime',
                    react: '@quilted/preact-mini-compat',
                    'react-dom/server': 'preact/compat/server',
                    'react-dom': '@quilted/preact-mini-compat',
                    'preact/jsx-dev-runtime': 'preact/jsx-runtime',
                  },
                }),
                ...plugins,
              ];
            });
          }
        });
      });
    });

    tasks.dev.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig?.hook(addReactBabelPreset);
      });
    });

    tasks.test.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig, jestModuleMapper}) => {
        babelConfig?.hook(addReactBabelPreset);

        jestModuleMapper?.hook((moduleMapper) => ({
          ...moduleMapper,
          '^react$': '@quilted/preact-mini-compat',
          '^react/jsx-runtime$': 'preact/jsx-runtime',
          '^react-dom$': '@quilted/preact-mini-compat',
          '^react-dom/server$': 'preact/compat/server',
          '^preact/jsx-dev-runtime$': 'preact/jsx-runtime',
          '^@quilted/react-testing$': '@quilted/react-testing/preact',
          '^@quilted/react-testing/dom$': '@quilted/react-testing/preact',
        }));
      });
    });
  });
}
