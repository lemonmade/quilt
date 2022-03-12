import {createProjectPlugin, ResolvedHooks} from '@quilted/sewing-kit';
import type {
  App,
  Service,
  WaterfallHook,
  DevelopAppConfigurationHooks,
} from '@quilted/sewing-kit';
import type {Plugin} from 'rollup';
import {stripIndent} from 'common-tags';

import type {} from '@quilted/sewing-kit-rollup';
import type {} from '@quilted/sewing-kit-vite';

import {MAGIC_MODULE_ENV} from '../constants';

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
    build({hooks, configure}) {
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
            const [runtime, inline] = await Promise.all([
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              magicModuleEnvPlugin({
                inline,
                runtime,
                env: {},
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
              ...plugins,
            ];
          });
        },
      );
    },
    develop({hooks, configure}) {
      hooks<Hooks>(({waterfall}) => ({
        quiltInlineEnvironmentVariables: waterfall(),
        quiltRuntimeEnvironmentVariables: waterfall(),
        quiltEnvModuleContent: waterfall(),
      }));

      configure(
        ({
          rollupPlugins,
          vitePlugins,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
          quiltEnvModuleContent,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          rollupPlugins?.(async (plugins) => {
            const [runtime, inline] = await Promise.all([
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              magicModuleEnvPlugin({
                inline,
                runtime,
                env: {},
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
              ...plugins,
            ];
          });

          vitePlugins?.(async (plugins) => {
            const [runtime, inline] = await Promise.all([
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              {
                ...magicModuleEnvPlugin({
                  inline,
                  runtime,
                  env: {},
                  customize: (content) => quiltEnvModuleContent!.run(content),
                }),
                enforce: 'pre',
              },
              ...plugins,
            ];
          });
        },
      );
    },
  });
}

function magicModuleEnvPlugin({
  inline,
  runtime = '{}',
  env,
  customize,
}: {
  inline: string[];
  runtime?: string;
  env: Record<string, string>;
  customize(content: string): Promise<string>;
}): Plugin {
  const inlineEnv: Record<string, string> = {};

  for (const inlineVariable of inline.sort()) {
    const value = env[inlineVariable];
    if (value == null) continue;
    inlineEnv[inlineVariable] = value;
  }

  const defaultContent = stripIndent`
    const runtime = (${runtime});
    const inline = ${JSON.stringify(inlineEnv)};

    const Env = new Proxy(
      {},
      {
        get(_, property) {
          return inline[property] ?? runtime[property];
        },
      },
    );

    export default Env;
  `;

  return {
    name: '@quilted/magic-module-env',
    resolveId(id) {
      if (id === MAGIC_MODULE_ENV) return id;
      return null;
    },
    async load(id) {
      if (id !== MAGIC_MODULE_ENV) return null;

      const content = await customize(defaultContent);

      return content;
    },
  };
}
