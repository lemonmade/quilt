import {createProjectPlugin, Runtime, TargetRuntime} from '@sewing-kit/plugins';
import type {WebApp, Service} from '@sewing-kit/plugins';
import type {BuildWebAppConfigurationHooks} from '@sewing-kit/hooks';
import {mappedPolyfillsForEnv} from '@quilted/polyfills';
import type {} from '@sewing-kit/plugin-webpack';
import type {} from '@sewing-kit/plugin-jest';

import type {} from './web-app-multi-build';

export function polyfills() {
  return createProjectPlugin<WebApp | Service>(
    'Quilt.Polyfills',
    ({tasks, project}) => {
      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({target, hooks}) => {
          hooks.configure.hook((configuration) => {
            configuration.webpackAliases?.hook(async (aliases) => {
              let environment: string | string[] | undefined;

              if (target.runtime.includes(Runtime.Node)) {
                environment = 'node';
              } else if ('quiltBrowserslist' in configuration) {
                environment = await (configuration as BuildWebAppConfigurationHooks).quiltBrowserslist!.run(
                  undefined,
                );
              }

              const mappedPolyfills = mappedPolyfillsForEnv({
                target: environment as any,
              });

              return {...aliases, ...mappedPolyfills};
            });
          });
        });
      });

      tasks.dev.hook(({hooks}) => {
        hooks.configure.hook((configuration: BuildWebAppConfigurationHooks) => {
          configuration.webpackAliases?.hook(async (aliases) => {
            let environment: string | string[] | undefined;

            if (TargetRuntime.fromProject(project).includes(Runtime.Node)) {
              environment = 'node';
            } else if ('quiltBrowserslist' in configuration) {
              environment = await (configuration as BuildWebAppConfigurationHooks).quiltBrowserslist!.run(
                undefined,
              );
            }

            const mappedPolyfills = mappedPolyfillsForEnv({
              target: environment as any,
            });

            return {...aliases, ...mappedPolyfills};
          });
        });
      });

      tasks.test.hook(({hooks}) => {
        hooks.configure.hook(({jestModuleMapper}) => {
          jestModuleMapper?.hook((moduleMap) => {
            return {...moduleMap, ...mappedPolyfillsForEnv({target: 'node'})};
          });
        });
      });
    },
  );
}
