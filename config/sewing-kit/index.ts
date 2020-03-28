import {Package, createComposedProjectPlugin} from '@sewing-kit/plugins';

import {json} from '@sewing-kit/plugin-json';
import {react} from '@sewing-kit/plugin-react';
import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {jestConfigurationHooks} from '@sewing-kit/plugin-jest';
import {babelConfigurationHooks} from '@sewing-kit/plugin-babel';
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';

export function quiltPackage({binaryOnly = false} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    babelConfigurationHooks,
    jestConfigurationHooks,
    json(),
    javascript(),
    typescript(),
    react(),
    buildFlexibleOutputs({
      esnext: !binaryOnly,
      esmodules: !binaryOnly,
    }),
  ]);
}
