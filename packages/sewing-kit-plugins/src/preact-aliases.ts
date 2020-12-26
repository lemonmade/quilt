import {createProjectPlugin} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-jest';

export function preactAliases() {
  return createProjectPlugin('Quilt.PreactAliases', ({tasks: {test}}) => {
    test.hook(({hooks}) => {
      hooks.configure.hook((configure) => {
        configure.jestModuleMapper?.hook((moduleMapper) => ({
          ...moduleMapper,
          '^@quilted/react-testing$': '@quilted/react-testing/preact',
          '^@quilted/react-testing/dom$': '@quilted/react-testing/preact',
        }));
      });
    });
  });
}
