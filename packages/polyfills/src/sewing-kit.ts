import {createProjectPlugin, Runtime} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-jest';
import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-targets';

import type {PolyfillFeature} from './types';

export type {PolyfillFeature};

export interface Options {
  /**
   * The features you’d like to polyfill.
   */
  features?: PolyfillFeature[];
}

export function polyfills({features}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Polyfills',
    build({configure}) {
      configure(({runtime, targets, rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const [{polyfill}, resolvedRuntime] = await Promise.all([
            import('./rollup-parts'),
            runtime.run(),
          ]);

          plugins.push(
            polyfill({
              features,
              target: resolvedRuntime.includes(Runtime.Browser)
                ? await targets?.run([])
                : 'node',
            }),
          );

          return plugins;
        });
      });
    },
    develop({configure}) {
      configure(({runtime, targets, rollupPlugins}) => {
        rollupPlugins?.(async (plugins) => {
          const [{polyfill}, resolvedRuntime] = await Promise.all([
            import('./rollup-parts'),
            runtime.run(),
          ]);

          plugins.push(
            polyfill({
              features,
              target: resolvedRuntime.includes(Runtime.Browser)
                ? await targets?.run([])
                : 'node',
            }),
          );

          return plugins;
        });
      });
    },
    test({configure}) {
      configure(({jestModuleMapper}) => {
        jestModuleMapper?.(async (moduleMappings) => {
          const {polyfillAliasesForTarget} = await import('./aliases');

          const mappedPolyfills = polyfillAliasesForTarget('node', {
            polyfill: 'usage',
          });

          for (const [polyfill, mappedPolyfill] of Object.entries(
            mappedPolyfills,
          )) {
            moduleMappings[`${polyfill}$`] = mappedPolyfill;
          }

          return moduleMappings;
        });
      });
    },
  });
}
