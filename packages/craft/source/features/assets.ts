import {createProjectPlugin} from '../kit';
import type {} from '../tools/jest';
import {DEFAULT_STATIC_ASSET_EXTENSIONS} from '../constants';

const NAME = 'Quilt.Assets';

export function assets() {
  return createProjectPlugin({
    name: NAME,
    test({configure}) {
      configure(({jestModuleMapper}) => {
        jestModuleMapper?.(async (moduleMapper) => {
          const matcher = DEFAULT_STATIC_ASSET_EXTENSIONS.map((extension) =>
            extension.startsWith('.') ? extension.slice(1) : extension,
          ).join(',');

          moduleMapper[`\\.(${matcher})$`] = '@quilted/craft/jest/asset';
          return moduleMapper;
        });
      });
    },
  });
}
