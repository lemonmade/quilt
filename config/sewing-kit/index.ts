import {
  Package,
  createComposedProjectPlugin,
  createProjectTestPlugin,
  createProjectPlugin,
} from '@sewing-kit/plugins';

import {react} from '@sewing-kit/plugin-react';
import {javascript, updateBabelPreset} from '@sewing-kit/plugin-javascript';
import {typescript} from '@sewing-kit/plugin-typescript';
import {buildFlexibleOutputs} from '@sewing-kit/plugin-package-flexible-outputs';
import type {} from '@sewing-kit/plugin-jest';

export function quiltPackage({binaryOnly = false} = {}) {
  return createComposedProjectPlugin<Package>('Quilt.DefaultProject', [
    javascript(),
    typescript(),
    react(),
    reactJsxRuntime(),
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

// eslint-disable-next-line no-warning-comments
// TODO: should be in the React plugin
function reactJsxRuntime() {
  return createProjectPlugin('Quilt.ReactJsxRuntime', ({tasks}) => {
    const updateReactBabelPreset = updateBabelPreset(['@babel/preset-react'], {
      runtime: 'automatic',
      importSource: 'react',
    });

    tasks.build.hook(({hooks}) => {
      hooks.target.hook(({hooks}) => {
        hooks.configure.hook(({babelConfig}) => {
          babelConfig.hook(updateReactBabelPreset);
        });
      });
    });

    tasks.dev.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig.hook(updateReactBabelPreset);
      });
    });

    tasks.test.hook(({hooks}) => {
      hooks.configure.hook(({babelConfig}) => {
        babelConfig.hook(updateReactBabelPreset);
      });
    });
  });
}
