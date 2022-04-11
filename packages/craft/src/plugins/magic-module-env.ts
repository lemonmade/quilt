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
