import {createWorkspacePlugin, type WaterfallHook} from '../kit.ts';

import type {} from './prettier.ts';

export interface StylelintHooks {
  stylelintExtensions: WaterfallHook<string[]>;
}

export interface Options {
  /**
   * Controls whether you want to use the prettier integration for
   * stylelint. When set to `true`, which is also the default, stylelint
   * will prevent prettier from running directly on files with extensions
   * in the `stylelintExtensions` hook so that it can run through stylelint
   * instead. When `false`, prettier will still be allowed to run on
   * files processed by stylelint.
   */
  prettier?: boolean;
}

declare module '@quilted/sewing-kit' {
  interface LintWorkspaceConfigurationHooks extends StylelintHooks {}
}

const DEFAULT_EXTENSIONS = ['.css'];

/**
 * Runs Stylelint on your workspace.
 */
export function stylelint({
  prettier: usesPrettierStylelint = true,
}: Options = {}) {
  return createWorkspacePlugin({
    name: 'quilt.stylelint',
    lint({hooks, configure, run, options, workspace}) {
      hooks<StylelintHooks>(({waterfall}) => ({
        stylelintExtensions: waterfall(),
      }));

      if (usesPrettierStylelint) {
        configure(({prettierExtensions, stylelintExtensions}) => {
          prettierExtensions?.(async (extensions) => {
            const omitExtensions = new Set(
              await stylelintExtensions!.run(DEFAULT_EXTENSIONS),
            );

            return extensions.filter(
              (extension) => !omitExtensions.has(extension),
            );
          });
        });
      }

      run((step, {configuration}) =>
        step({
          name: 'quilt.stylelint',
          label: 'Running stylelint on your workspace',
          async run(step) {
            const {stylelintExtensions} = await configuration();
            const extensions = await stylelintExtensions!.run(
              DEFAULT_EXTENSIONS,
            );

            if (extensions.length === 0) return;

            // @see https://stylelint.io/user-guide/usage/options
            const result = await step.exec(
              'stylelint',
              [
                JSON.stringify(
                  `**/*.${
                    extensions.length === 1
                      ? trimExtension(extensions[0]!)
                      : extensions.map(trimExtension).join(',')
                  }`,
                ),
                '--max-warnings',
                '0',
                '--cache',
                '--cache-location',
                workspace.fs.temporaryPath('stylelint/cache'),
                ...(options.fix ? ['--fix'] : []),
                '--allow-empty-input',
              ],
              {
                fromNodeModules: import.meta.url,
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

function trimExtension(extension: string) {
  return extension.startsWith('.') ? extension.slice(1) : extension;
}
