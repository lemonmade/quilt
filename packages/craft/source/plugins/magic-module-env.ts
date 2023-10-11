import type {} from '../tools/rollup.ts';
import type {} from '../tools/vite.ts';

import {createProjectPlugin, type WaterfallHook} from '../kit.ts';

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
  interface BuildProjectConfigurationHooks extends Hooks {}
  interface DevelopProjectConfigurationHooks extends Hooks {}
}

export const NAME = 'Quilt.MagicModule.Env';

export function magicModuleEnv() {
  return createProjectPlugin({
    name: NAME,
    build({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltInlineEnvironmentVariables: waterfall(),
        quiltRuntimeEnvironmentVariables: waterfall(),
        quiltEnvModuleContent: waterfall(),
      }));
    },
    develop({hooks}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltInlineEnvironmentVariables: waterfall(),
        quiltRuntimeEnvironmentVariables: waterfall(),
        quiltEnvModuleContent: waterfall(),
      }));
    },
  });
}
