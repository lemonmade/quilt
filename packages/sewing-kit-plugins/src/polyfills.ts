import {createProjectPlugin, Runtime, TargetRuntime} from '@sewing-kit/plugins';
import type {WebApp, Service} from '@sewing-kit/plugins';
import type {
  BuildWebAppConfigurationHooks,
  BuildServiceConfigurationHooks,
  DevWebAppConfigurationHooks,
  DevServiceConfigurationHooks,
} from '@sewing-kit/hooks';
import type {PolyfillFeature} from '@quilted/polyfills';
import {updateSewingKitBabelPreset} from '@sewing-kit/plugin-javascript';
import type {} from '@sewing-kit/plugin-jest';

import type {} from './web-app-multi-build';

export function polyfills({features}: {features?: PolyfillFeature[]} = {}) {
  return createProjectPlugin<WebApp | Service>(
    'Quilt.Polyfills',
    ({tasks, project}) => {
      function addConfiguration(
        configuration:
          | BuildWebAppConfigurationHooks
          | BuildServiceConfigurationHooks
          | DevWebAppConfigurationHooks
          | DevServiceConfigurationHooks,
      ) {
        const {rollupPlugins, babelConfig} = configuration;

        babelConfig?.hook(updateSewingKitBabelPreset({polyfill: 'usage'}));

        if (features) {
          rollupPlugins?.hook(async (plugins) => {
            const {polyfill} = await import('@quilted/polyfills/rollup');

            let target: 'node' | string[] | undefined;

            if (TargetRuntime.fromProject(project).includes(Runtime.Node)) {
              target = 'node';
            } else if ('quiltBrowserslist' in configuration) {
              const browserlist = await configuration.quiltBrowserslist!.run(
                undefined,
              );

              target =
                typeof browserlist === 'string' ? [browserlist] : browserlist;
            }

            return [...plugins, polyfill({target, features})];
          });
        }
      }

      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook(addConfiguration);
        });
      });

      tasks.dev.hook(({hooks}) => {
        hooks.configure.hook(addConfiguration);
      });

      tasks.test.hook(({hooks}) => {
        hooks.configure.hook(({jestModuleMapper}) => {
          jestModuleMapper?.hook(async (moduleMap) => {
            const {polyfillAliasesForTarget} = await import(
              '@quilted/polyfills'
            );

            const mappedPolyfills = polyfillAliasesForTarget('node', {
              polyfill: 'usage',
            });

            return {
              ...moduleMap,
              ...Object.entries(mappedPolyfills).reduce<Record<string, string>>(
                (mapped, [polyfill, alias]) => ({
                  ...mapped,
                  [`${polyfill}$`]: alias,
                }),
                {},
              ),
            };
          });
        });
      });
    },
  );
}
