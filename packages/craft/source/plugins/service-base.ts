import {createProjectPlugin, DiagnosticError} from '../kit.ts';
import type {Project, WaterfallHookWithDefault} from '../kit.ts';

import type {EnvironmentOptions} from './magic-module-env.ts';

export interface Options {
  env?: EnvironmentOptions;
  entry?: string;
}

export interface ServiceBaseConfigurationHooks {
  /**
   * The module that acts as the entrypoint for this service.
   */
  readonly quiltServiceEntry: WaterfallHookWithDefault<string>;
}

declare module '@quilted/sewing-kit' {
  interface BuildProjectConfigurationHooks
    extends ServiceBaseConfigurationHooks {}
  interface DevelopProjectConfigurationHooks
    extends ServiceBaseConfigurationHooks {}
}

export function serviceBase({env, entry}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.ServiceBase',
    build({hooks, configure, project, workspace}) {
      hooks<ServiceBaseConfigurationHooks>(({waterfall}) => ({
        quiltServiceEntry: waterfall({
          default: () =>
            entry ? project.fs.resolvePath(entry) : getEntryForProject(project),
        }),
      }));

      configure(
        ({
          runtimes,
          rollupPlugins,
          quiltServiceEntry,
          quiltRequestRouterEntry,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
        }) => {
          runtimes(() => [{target: 'node'}]);

          quiltRequestRouterEntry?.(() => quiltServiceEntry!.run());

          rollupPlugins?.(async (plugins) => {
            const [{magicModuleEnv}, inlineEnv, runtimeEnv] = await Promise.all(
              [
                import('../tools/rollup/env.ts'),
                quiltInlineEnvironmentVariables!.run(env?.inline ?? []),
                quiltRuntimeEnvironmentVariables!.run('process.env'),
              ],
            );

            return [
              magicModuleEnv({
                mode: 'production',
                dotenv: {roots: [project.fs.root, workspace.fs.root]},
                inline: inlineEnv,
                runtime: runtimeEnv,
              }),
              ...plugins,
            ];
          });
        },
      );
    },
    develop({hooks, configure, project, workspace}) {
      hooks<ServiceBaseConfigurationHooks>(({waterfall}) => ({
        quiltServiceEntry: waterfall({
          default: () =>
            entry ? project.fs.resolvePath(entry) : getEntryForProject(project),
        }),
      }));

      configure(
        ({
          runtimes,
          rollupPlugins,
          quiltServiceEntry,
          quiltRequestRouterEntry,
          quiltInlineEnvironmentVariables,
          quiltRuntimeEnvironmentVariables,
        }) => {
          runtimes(() => [{target: 'node'}]);

          quiltRequestRouterEntry?.(() => quiltServiceEntry!.run());

          rollupPlugins?.(async (plugins) => {
            const [{magicModuleEnv}, inlineEnv, runtimeEnv] = await Promise.all(
              [
                import('../tools/rollup/env.ts'),
                quiltInlineEnvironmentVariables!.run(env?.inline ?? []),
                quiltRuntimeEnvironmentVariables!.run('process.env'),
              ],
            );

            return [
              magicModuleEnv({
                mode: 'development',
                dotenv: {roots: [project.fs.root, workspace.fs.root]},
                inline: inlineEnv,
                runtime: runtimeEnv,
              }),
              ...plugins,
            ];
          });
        },
      );
    },
  });
}

async function getEntryForProject(project: Project) {
  const main = project.packageJson?.raw.main;

  if (typeof main === 'string') return project.fs.resolvePath(main);

  const [entry] = await project.fs.glob('index.{ts,tsx,js,jsx}', {
    absolute: true,
  });

  if (entry == null) {
    throw new DiagnosticError({
      title: `Could not find entry for service ${project.name}`,
      suggestion: `Add the \`entry\` option to the \`quiltService()\` call in its \`quilt.project.ts\` file. This option should point to a file that runs your service. Alternatively, you can set the path to this file as the "main" property in the app’s package.json file.`,
    });
  }

  return entry;
}
