import {createComposedProjectPlugin} from '@sewing-kit/plugins';

import {javascriptProjectPlugin} from '@sewing-kit/plugin-javascript';
import {typeScriptProjectPlugin} from '@sewing-kit/plugin-typescript';
import {jestProjectPlugin} from '@sewing-kit/plugin-jest';
import {reactProjectPlugin} from '@sewing-kit/plugin-react';
import {babelProjectPlugin} from '@sewing-kit/plugin-babel';
import {jsonProjectPlugin} from '@sewing-kit/plugin-json';
import {createPackageFlexibleOutputsPlugin} from '@sewing-kit/plugin-package-flexible-outputs';

export const defaultProjectPlugin = createComposedProjectPlugin(
  'Quilt.DefaultProject',
  [
    babelProjectPlugin,
    jestProjectPlugin,
    jsonProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    reactProjectPlugin,
    createPackageFlexibleOutputsPlugin({
      esmodules: false,
    }),
  ],
);

export const nodeOnlyProjectPlugin = createComposedProjectPlugin(
  'Quilt.NodeOnlyProject',
  [
    babelProjectPlugin,
    jestProjectPlugin,
    jsonProjectPlugin,
    javascriptProjectPlugin,
    typeScriptProjectPlugin,
    reactProjectPlugin,
    createPackageFlexibleOutputsPlugin({
      esmodules: false,
      esnext: false,
    }),
  ],
);
