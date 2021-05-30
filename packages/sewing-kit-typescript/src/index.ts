import {createProjectPlugin} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-rollup';

/**
 * Adds configuration for TypeScript to a variety of other build tools.
 */
export function typescriptProject() {
  return createProjectPlugin({
    name: 'SewingKit.TypeScript',
    build({configure}) {
      configure(({babelPresets, rollupNodeExtensions}) => {
        // Add TypeScript compilation to Babel
        babelPresets?.((presets) => [...presets, '@babel/preset-typescript']);

        // Let the rollup build see our source TypeScript files.
        rollupNodeExtensions?.((extensions) =>
          Array.from(new Set(['.tsx', '.ts', ...extensions])),
        );
      });
    },
    develop({configure}) {
      configure(({babelPresets, rollupNodeExtensions}) => {
        // Add TypeScript compilation to Babel
        babelPresets?.((presets) => [...presets, '@babel/preset-typescript']);

        // Let the rollup build see our source TypeScript files.
        rollupNodeExtensions?.((extensions) =>
          Array.from(new Set(['.tsx', '.ts', ...extensions])),
        );
      });
    },
  });
}
