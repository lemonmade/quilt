import {createProjectPlugin, createWorkspacePlugin} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-eslint';

/**
 * Adds configuration for TypeScript to a variety of other build tools.
 */
export function typescriptProject() {
  return createProjectPlugin({
    name: 'SewingKit.TypeScript',
    build({configure}) {
      configure(({extensions, babelPresets}) => {
        // Let us import from TypeScript files without extensions
        extensions((extensions) =>
          Array.from(new Set(['.tsx', '.ts', ...extensions])),
        );

        // Add TypeScript compilation to Babel
        babelPresets?.((presets) => [...presets, '@babel/preset-typescript']);
      });
    },
    develop({configure}) {
      configure(({extensions, babelPresets}) => {
        // Let us import from TypeScript files without extensions
        extensions((extensions) =>
          Array.from(new Set(['.tsx', '.ts', ...extensions])),
        );

        // Add TypeScript compilation to Babel
        babelPresets?.((presets) => [...presets, '@babel/preset-typescript']);
      });
    },
  });
}

/**
 * Runs TypeScript at using project references from the root of your
 * workspace, and configures TypeScript for workspace-level tools like
 * ESLint.
 */
export function typescriptWorkspace() {
  return createWorkspacePlugin({
    name: 'SewingKit.TypeScript',
    lint({configure}) {
      configure(({eslintExtensions}) => {
        eslintExtensions?.((extensions) =>
          Array.from(new Set([...extensions, '.ts', '.tsx'])),
        );
      });
    },
    // TODO
    // typeCheck({run}) {
    //   run((step) =>
    //     step({
    //       name: 'SewingKit.TypeScript',
    //       label: 'Running TypeScript type checking',
    //       async run() {},
    //     }),
    //   );
    // },
  });
}
