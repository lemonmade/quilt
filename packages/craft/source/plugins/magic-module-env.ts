import type {} from '../tools/rollup';
import type {} from '../tools/vite';

import {createProjectPlugin, ResolvedHooks} from '../kit';
import type {
  App,
  Service,
  WaterfallHook,
  DevelopAppConfigurationHooks,
} from '../kit';

export interface EnvironmentOptions {
  /**
   * Environment variables that should be hardcoded on the `Env` module from
   * `@quilted/quilt/env`. Any environment variables passed here will have their
   * value preserved from the build environment, so this option is most useful for
   * copying environment variables from the build to production environment.
   *
   * Before attempting to preserve an environment variable’s value, Quilt will
   * attempt to load .env configuration from your project and workspace root directories.
   * Quilt will look for environment variables in the following files, depending on
   * environment:
   *
   * - .env
   * - .env.local (for local overrides)
   * - .env.{production,development} (for environment-specific overrides)
   * - .env.{production,development}.local (for local environment-specific overrides)
   *
   * Runtime environment variables always take precedence over build-time variables,
   * if both are defined.
   */
  inline?: string[];
}

export interface Hooks {
  /**
   * The environment variables to inline into built assets.
   */
  quiltInlineEnvironmentVariables: WaterfallHook<string[]>;

  /**
   * A value that will be used to reference the runtime environment variables.
   * Defaults to `{}`, an empty object. If you customize this value, you must
   * only include an expression, and it must not end with a semicolon.
   */
  quiltRuntimeEnvironmentVariables: WaterfallHook<string | undefined>;

  /**
   * The content that will be used to create the magic `@quilted/quilt/env` module.
   */
  quiltEnvModuleContent: WaterfallHook<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends Hooks {}
  interface DevelopAppConfigurationHooks extends Hooks {}
  interface BuildServiceConfigurationHooks extends Hooks {}
  interface DevelopServiceConfigurationHooks extends Hooks {}
}

export const NAME = 'Quilt.MagicModule.Env';

export function magicModuleEnv() {
  return createProjectPlugin<App | Service>({
    name: NAME,
    build({project, workspace, hooks, configure}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltInlineEnvironmentVariables: waterfall(),
        quiltRuntimeEnvironmentVariables: waterfall(),
        quiltEnvModuleContent: waterfall(),
      }));

      configure(
        ({
          rollupPlugins,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
          quiltEnvModuleContent,
        }) => {
          rollupPlugins?.(async (plugins) => {
            const {magicModuleEnv} = await import('./rollup/magic-module-env');

            return [
              magicModuleEnv({
                mode: 'production',
                project,
                workspace,
                inline: () => quiltInlineEnvironmentVariables!.run([]),
                runtime: () => quiltRuntimeEnvironmentVariables!.run(undefined),
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
              ...plugins,
            ];
          });
        },
      );
    },
    develop({project, workspace, hooks, configure}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltInlineEnvironmentVariables: waterfall(),
        quiltRuntimeEnvironmentVariables: waterfall(),
        quiltEnvModuleContent: waterfall(),
      }));

      configure(
        ({
          rollupPlugins,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
          quiltEnvModuleContent,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          rollupPlugins?.(async (plugins) => {
            const {magicModuleEnv} = await import('./rollup/magic-module-env');

            return [
              magicModuleEnv({
                mode: 'development',
                project,
                workspace,
                inline: () => quiltInlineEnvironmentVariables!.run([]),
                runtime: () => quiltRuntimeEnvironmentVariables!.run(undefined),
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
              ...plugins,
            ];
          });
        },
      );
    },
  });
}
