import type {Plugin} from 'rollup';

import {createProjectPlugin} from '@sewing-kit/plugins';
import type {WebApp} from '@sewing-kit/plugins';
import type {} from '@sewing-kit/plugin-rollup';
import type {} from '@sewing-kit/plugin-jest';

export function webAppConvenienceAliases() {
  return createProjectPlugin<WebApp>(
    'Quilt.WebAppConvenienceAliases',
    ({project, tasks: {dev, build, test}}) => {
      dev.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.rollupPlugins?.hook(addRollupPlugin);
        });
      });

      build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook((configuration) => {
            configuration.rollupPlugins?.hook(addRollupPlugin);
          });
        });
      });

      test.hook(({hooks}) => {
        hooks.configure.hook((configure) => {
          configure.jestModuleMapper?.hook((moduleMapper) => ({
            ...moduleMapper,
            '^components': project.fs.resolvePath('components'),
            '^utilities/(.*)': project.fs.resolvePath('utilities/$1'),
            '^tests/(.*)': project.fs.resolvePath('tests/$1'),
          }));
        });
      });

      async function addRollupPlugin(plugins: Plugin[]) {
        const {default: alias} = await import('@rollup/plugin-alias');

        return [
          alias({
            entries: {
              utilities: project.fs.resolvePath('utilities'),
              components: project.fs.resolvePath('components'),
            },
          }),
          ...plugins,
        ];
      }
    },
  );
}
