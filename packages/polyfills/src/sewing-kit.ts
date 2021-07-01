import {createProjectPlugin, Runtime} from '@quilted/sewing-kit';
import type {WaterfallHookWithDefault} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-jest';
import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-targets';

import type {PolyfillFeature} from './types';

export type {PolyfillFeature};

export interface PolyfillHooks {
  /**
   * The additional polyfills to include for this project.
   */
  quiltPolyfillFeatures: WaterfallHookWithDefault<PolyfillFeature[]>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks extends PolyfillHooks {}
  interface DevelopProjectConfigurationHooks extends PolyfillHooks {}
  interface TestProjectConfigurationHooks extends PolyfillHooks {}
}

export interface Options {
  /**
   * The features you’d like to polyfill.
   */
  features?: PolyfillFeature[];
}

export function polyfills({features}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Polyfills',
    build({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(({runtime, targets, rollupPlugins, quiltPolyfillFeatures}) => {
        rollupPlugins?.(async (plugins) => {
          const [{polyfill}, resolvedFeatures, resolvedRuntime] =
            await Promise.all([
              import('./rollup-parts'),
              quiltPolyfillFeatures!.run(),
              runtime.run(),
            ]);

          plugins.push(
            polyfill({
              features: resolvedFeatures,
              target: resolvedRuntime.includes(Runtime.Browser)
                ? await targets?.run([])
                : 'node',
            }),
          );

          return plugins;
        });
      });
    },
    develop({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(({runtime, targets, rollupPlugins, quiltPolyfillFeatures}) => {
        rollupPlugins?.(async (plugins) => {
          const [{polyfill}, resolvedFeatures, resolvedRuntime] =
            await Promise.all([
              import('./rollup-parts'),
              quiltPolyfillFeatures!.run(),
              runtime.run(),
            ]);

          plugins.push(
            polyfill({
              features: resolvedFeatures,
              target: resolvedRuntime.includes(Runtime.Browser)
                ? await targets?.run([])
                : 'node',
            }),
          );

          return plugins;
        });
      });
    },
    test({configure, hooks}) {
      hooks<PolyfillHooks>(({waterfall}) => ({
        quiltPolyfillFeatures: waterfall({
          default: () => features ?? [],
        }),
      }));

      configure(({jestModuleMapper, quiltPolyfillFeatures}) => {
        jestModuleMapper?.(async (moduleMappings) => {
          const [{polyfillAliasesForTarget}, resolvedFeatures] =
            await Promise.all([
              import('./aliases'),
              quiltPolyfillFeatures!.run(),
            ]);

          const mappedPolyfills = polyfillAliasesForTarget('node', {
            features: resolvedFeatures,
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
