import {createWorkspacePlugin} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

import type {} from '@quilted/sewing-kit-prettier';

export interface ESLintHooks {
  eslintExtensions: WaterfallHook<string[]>;
}

export interface Options {
  /**
   * Controls whether you want to use the prettier integration for
   * ESLint. When set to `true`, which is also the default, ESLint
   * will prevent prettier from running directly on files with extensions
   * in the `eslintExtensions` hook so that it can run through ESLint
   * instead. When `false`, prettier will still be allowed to run on
   * files processed by ESLint.
   */
  prettier?: boolean;
}

declare module '@quilted/sewing-kit' {
  interface LintWorkspaceConfigurationHooks extends ESLintHooks {}
}

const DEFAULT_EXTENSIONS = ['.mjs', '.cjs', '.js'];

/**
 * Runs ESLint on your workspace.
 */
export function eslint({prettier: usesPrettierESLint = true}: Options = {}) {
  return createWorkspacePlugin({
    name: 'SewingKit.ESLint',
    lint({hooks, configure, run, options, internal}) {
      hooks<ESLintHooks>(({waterfall}) => ({
        eslintExtensions: waterfall(),
      }));

      if (usesPrettierESLint) {
        configure(({prettierExtensions, eslintExtensions}) => {
          prettierExtensions?.(async (extensions) => {
            const omitExtensions = new Set(
              await eslintExtensions!.run(DEFAULT_EXTENSIONS),
            );

            return extensions.filter(
              (extension) => !omitExtensions.has(extension),
            );
          });
        });
      }

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.ESLint',
          label: 'Running ESLint on your workspace',
          async run(step) {
            const {eslintExtensions} = await configuration();
            const extensions = await eslintExtensions!.run(DEFAULT_EXTENSIONS);

            const result = await step.exec(
              'eslint',
              [
                '.',
                '--max-warnings',
                '0',
                '--cache',
                '--cache-location',
                // ESLint requires the trailing slash, don’t remove it
                // @see https://eslint.org/docs/user-guide/command-line-interface#-cache-location
                `${internal.fs.tempPath('eslint/cache')}/`,
                ...(options.fix ? ['--fix'] : []),
                ...extensions.map((ext) => ['--ext', ext]).flat(),
              ],
              {
                fromNodeModules: true,
                env: {FORCE_COLOR: '1', ...process.env},
              },
            );

            const output = result.stdout.trim();
            if (output.length) step.log(output);
          },
        }),
      );
    },
  });
}
