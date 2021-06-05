import {
  createProjectPlugin,
  createWorkspacePlugin,
  DiagnosticError,
} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-babel';
import type {} from '@quilted/sewing-kit-eslint';
import type {} from '@quilted/sewing-kit-jest';
import type {} from '@quilted/sewing-kit-rollup';

export interface TypeScriptHooks {
  typescriptHeap: WaterfallHook<number | undefined>;
}

declare module '@quilted/sewing-kit' {
  interface TypeCheckWorkspaceConfigurationHooks extends TypeScriptHooks {}
}

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
    test({configure}) {
      configure(
        ({jestExtensions, jestTransforms, babelPresets, babelPlugins}) => {
          babelPresets?.((presets) => [...presets, '@babel/preset-typescript']);

          // Add TypeScript extensions for project-level tests
          jestExtensions?.((extensions) =>
            Array.from(new Set([...extensions, '.ts', '.tsx'])),
          );

          jestTransforms?.(async (transforms) => {
            const [presets, plugins] = await Promise.all([
              babelPresets?.run(['@babel/preset-env']),
              babelPlugins?.run([]),
            ]);

            transforms['\\.tsx?$'] = [
              'babel-jest',
              {
                presets,
                plugins,
                configFile: false,
                babelrc: false,
                targets: 'current node',
              },
            ];
            return transforms;
          });
        },
      );
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
        // Add TypeScript linting to ESLint
        eslintExtensions?.((extensions) =>
          Array.from(new Set([...extensions, '.ts', '.tsx'])),
        );
      });
    },
    test({configure}) {
      configure(({jestExtensions}) => {
        // Add TypeScript extensions for workspace-level tests
        jestExtensions?.((extensions) =>
          Array.from(new Set([...extensions, '.ts', '.tsx'])),
        );
      });
    },
    typeCheck({hooks, run, workspace}) {
      hooks<TypeScriptHooks>(({waterfall}) => ({typescriptHeap: waterfall()}));

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.TypeScript',
          label: 'Run TypeScript on your workspace',
          async run(step) {
            const {typescriptHeap} = await configuration();
            const heap = await typescriptHeap!.run(undefined);
            const heapArguments = heap ? [`--max-old-space-size=${heap}`] : [];

            try {
              await step.exec(
                'node',
                [
                  ...heapArguments,
                  workspace.fs.resolvePath('node_modules/.bin/tsc'),
                  '--build',
                  '--pretty',
                ],
                {env: {FORCE_COLOR: '1', ...process.env}},
              );
            } catch (error) {
              throw new DiagnosticError({
                title: 'TypeScript found type errors',
                content: error.stderr || error.stdout,
              });
            }
          },
        }),
      );
    },
  });
}
