import {createProjectTestPlugin} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-jest';

const PLUGIN = 'Quilt.Testing';

export interface Options {
  preact?: boolean;
}

export function reactTesting({preact = false}: Options = {}) {
  return createProjectTestPlugin(PLUGIN, ({hooks}) => {
    if (!preact) return;

    hooks.configure.hook((configuration) => {
      configuration.jestModuleMapper?.hook((nameMap) => ({
        ...nameMap,
        '^@quilted/react-testing$': '@quilted/react-testing/preact',
        '^@quilted/react-testing/dom$': '@quilted/react-testing/preact',
      }));
    });
  });
}
