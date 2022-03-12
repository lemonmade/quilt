import {createProjectPlugin, ResolvedHooks} from '@quilted/sewing-kit';
import type {
  App,
  Service,
  Project,
  Workspace,
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
            const [env, runtime, inline] = await Promise.all([
              loadEnv(project, workspace, {mode: 'production'}),
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              magicModuleEnvPlugin({
                env,
                inline,
                runtime,
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
          vitePlugins,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
          quiltEnvModuleContent,
        }: ResolvedHooks<DevelopAppConfigurationHooks>) => {
          rollupPlugins?.(async (plugins) => {
            const [env, runtime, inline] = await Promise.all([
              loadEnv(project, workspace, {mode: 'development'}),
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              magicModuleEnvPlugin({
                env,
                inline,
                runtime,
                customize: (content) => quiltEnvModuleContent!.run(content),
              }),
              ...plugins,
            ];
          });

          vitePlugins?.(async (plugins) => {
            const [env, runtime, inline] = await Promise.all([
              loadEnv(project, workspace, {mode: 'development'}),
              quiltRuntimeEnvironmentVariables!.run(undefined),
              quiltInlineEnvironmentVariables!.run([]),
            ]);

            return [
              {
                ...magicModuleEnvPlugin({
                  env,
                  inline,
                  runtime,
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
  env,
  inline,
  runtime = '{}',
  customize,
}: {
  env: Record<string, string | undefined>;
  inline: string[];
  runtime?: string;
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

// Inspired by https://github.com/vitejs/vite/blob/e0a4d810598d1834933ed437ac5a2168cbbbf2f8/packages/vite/src/node/config.ts#L1050-L1113
async function loadEnv(
  project: Project,
  workspace: Workspace,
  {mode}: {mode: 'production' | 'development'},
): Promise<Record<string, string | undefined>> {
  const env: Record<string, string | undefined> = {...process.env};

  const envFiles = [
    // default file
    `.env`,
    // local file
    `.env.local`,
    // mode file
    `.env.${mode}`,
    // mode local file
    `.env.${mode}.local`,
  ];

  const {parse} = await import('dotenv');

  const loadEnvFile = async (file: string) => {
    if (await workspace.fs.hasFile(file)) {
      return parse(await workspace.fs.read(file));
    }
  };

  const envFileResults = await Promise.all([
    ...envFiles.map((file) => loadEnvFile(workspace.fs.resolvePath(file))),
    ...envFiles.map((file) => loadEnvFile(project.fs.resolvePath(file))),
  ]);

  for (const envFileResult of envFileResults) {
    if (envFileResult == null) continue;
    Object.assign(env, envFileResult);
  }

  return env;
}
