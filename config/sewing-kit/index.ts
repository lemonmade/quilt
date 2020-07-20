import {
  Package,
  createComposedProjectPlugin,
  createProjectTestPlugin,
} from '@sewing-kit/plugins';

import {react} from '@sewing-kit/plugin-react';
import {javascript} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import type {} from '@sewing-kit/plugin-jest';

export function quiltPackage({binaryOnly = false} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    javascript(),
    typescript(),
    react(),
    buildFlexibleOutputs({
      esnext: !binaryOnly,
      esmodules: !binaryOnly,
    }),
    createProjectTestPlugin('Quilt.IgnoreDTSFiles', ({hooks}) => {
      hooks.configure.hook((configuration) => {
        configuration.jestWatchIgnore.hook((ignore) => [
          ...ignore,
          '.*\\.d\\.ts$',
        ]);
      });
    }),
  ]);
}
