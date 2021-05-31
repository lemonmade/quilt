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
          async run() {
            const [
              {promisify},
              {execFile},
              {eslintExtensions},
            ] = await Promise.all([
              import('util'),
              import('child_process'),
              configuration(),
            ]);

            const exec = promisify(execFile);

            const extensions = await eslintExtensions!.run(['.mjs', '.js']);

            try {
              const result = await exec(
                'node_modules/.bin/eslint',
                ['.', ...extensions.map((ext) => ['--ext', ext]).flat()],
                {env: {FORCE_COLOR: '1', ...process.env}},
              );

              // TODO how to log this properly and signal that we have failed?

              // eslint-disable-next-line no-console
              console.log(result.stdout);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log(error.stdout);
            }
          },
        }),
      );
    },
  });
}
