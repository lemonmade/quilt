import {createProjectPlugin} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-jest';
import type {} from '@sewing-kit/plugin-webpack';

export function preactAliases() {
  return createProjectPlugin(
    'Quilt.PreactAliases',
    ({tasks: {test, build, dev}}) => {
      build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook(({webpackAliases}) => {
            webpackAliases?.hook((aliases) => ({
              ...aliases,
              react: '@quilted/preact-mini-compat',
              'react/jsx-runtime': 'preact/jsx-runtime',
            }));
          });
        });
      });

      dev.hook(({hooks}) => {
        hooks.configure.hook(({webpackAliases}) => {
          webpackAliases?.hook((aliases) => ({
            ...aliases,
            react: '@quilted/preact-mini-compat',
            'react/jsx-runtime': 'preact/jsx-runtime',
          }));
        });
      });

      test.hook(({hooks}) => {
        hooks.configure.hook(({jestModuleMapper}) => {
          jestModuleMapper?.hook((moduleMapper) => ({
            ...moduleMapper,
            '^react$': '@quilted/preact-mini-compat',
            '^react/jsx-runtime$': 'preact/jsx-runtime',
            '^@quilted/react-testing$': '@quilted/react-testing/preact',
            '^@quilted/react-testing/dom$': '@quilted/react-testing/preact',
          }));
        });
      });
    },
  );
}
