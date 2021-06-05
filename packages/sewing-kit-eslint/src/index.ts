import {createWorkspacePlugin} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

export interface ESLintHooks {
  eslintExtensions: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface LintWorkspaceConfigurationHooks extends ESLintHooks {}
}

/**
 * Runs ESLint on your workspace.
 */
export function eslint() {
  return createWorkspacePlugin({
    name: 'SewingKit.ESLint',
    lint({hooks, run}) {
      hooks<ESLintHooks>(({waterfall}) => ({
        eslintExtensions: waterfall(),
      }));

      run((step, {configuration}) =>
        step({
          name: 'SewingKit.ESLint',
          label: 'Running ESLint on your workspace',
          async run(step) {
            const {eslintExtensions} = await configuration();
            const extensions = await eslintExtensions!.run(['.mjs', '.js']);

            const result = await step.exec(
              'eslint',
              ['.', ...extensions.map((ext) => ['--ext', ext]).flat()],
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
