import type {Config} from '@jest/types';

import {createWorkspacePlugin} from '@quilted/sewing-kit';
import type {WaterfallHook} from '@quilted/sewing-kit';

export type JestConfig = Config.InitialOptions;
export type JestProjectConfig = Config.InitialProjectOptions;

export interface JestProjectHooks {
  jestExtensions: WaterfallHook<string[]>;
  jestEnvironment: WaterfallHook<string | undefined>;
  jestModuleMapper: WaterfallHook<Record<string, string>>;
  jestSetupEnv: WaterfallHook<string[]>;
  jestSetupTests: WaterfallHook<string[]>;
  jestTransforms: WaterfallHook<Record<string, string>>;
  jestTestMatch: WaterfallHook<string[]>;
  jestConfig: WaterfallHook<JestConfig>;
  jestWatchIgnore: WaterfallHook<string[]>;
}

export interface JestFlags {
  ci?: boolean;
  config?: string;
  watch?: boolean;
  watchAll?: boolean;
  testNamePattern?: string;
  testPathPattern?: string;
  runInBand?: boolean;
  forceExit?: boolean;
  maxWorkers?: number;
  onlyChanged?: boolean;
  coverage?: boolean;
  updateSnapshot?: boolean;
  cacheDirectory?: string;
  [key: string]: unknown;
}

export interface JestWorkspaceHooks {
  jestConfig: WaterfallHook<JestConfig>;
  jestFlags: WaterfallHook<JestFlags>;
  jestWatchPlugins: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface TestProjectConfigurationHooks extends JestProjectHooks {}
  interface TestWorkspaceConfigurationHooks extends JestWorkspaceHooks {}
}

/**
 * Adds a collection of hooks to the workspace and all its projects
 * for running Jest, and configures Jest to run for this workspace.
 */
export function jest() {
  return createWorkspacePlugin({
    name: 'SewingKit.Jest',
    test({workspace, hooks, run, project}) {
      hooks<JestWorkspaceHooks>(({waterfall}) => ({
        jestConfig: waterfall(),
        jestFlags: waterfall(),
        jestWatchPlugins: waterfall(),
      }));

      project(({hooks}) => {
        hooks<JestProjectHooks>(({waterfall}) => ({
          jestConfig: waterfall(),
          jestEnvironment: waterfall(),
          jestExtensions: waterfall(),
          jestModuleMapper: waterfall(),
          jestSetupEnv: waterfall(),
          jestSetupTests: waterfall(),
          jestTestMatch: waterfall(),
          jestTransforms: waterfall(),
          jestWatchIgnore: waterfall(),
        }));
      });

      run((step, {configuration, projectConfiguration}) =>
        step({
          name: 'SewingKit.Jest',
          label: 'Run Jest',
          async run() {
            const [{run: runJest}, {jestConfig, jestFlags, jestWatchPlugins}] =
              await Promise.all([import('jest'), configuration()]);

            const truthyEnvValues = new Set(['true', '1']);
            const isCi = [process.env.CI, process.env.GITHUB_ACTIONS].some(
              (envVar) => Boolean(envVar) && truthyEnvValues.has(envVar!),
            );

            // TODO
            // const {
            //   coverage = false,
            //   debug = false,
            //   watch = !isCi,
            //   testPattern,
            //   testNamePattern,
            //   updateSnapshots,
            // } = options;

            const projects = await Promise.all(
              workspace.projects.map(
                async (project): Promise<JestProjectConfig> => {
                  const {
                    jestConfig,
                    jestEnvironment,
                    jestExtensions,
                    jestModuleMapper,
                    jestSetupEnv,
                    jestSetupTests,
                    jestTestMatch,
                    jestTransforms,
                    jestWatchIgnore,
                  } = await projectConfiguration(project);

                  return {};
                },
              ),
            );

            const [watchPlugins] = await Promise.all([
              jestWatchPlugins!.run([
                'jest-watch-typeahead/filename',
                'jest-watch-typeahead/testname',
              ]),
            ]);

            const config = await jestConfig!.run({
              rootDir: workspace.root,
              projects,
              watchPlugins,
            });

            const flags = await jestFlags!.run({
              ci: isCi ? isCi : undefined,
              config: rootConfigPath,
              // coverage,
              // watch: watch && testPattern == null,
              // watchAll: watch && testPattern != null,
              onlyChanged: !isCi /* && testPattern == null, */,
              // testNamePattern,
              // testPathPattern: testPattern,
              // updateSnapshot: updateSnapshots,
              // runInBand: debug,
              // forceExit: debug,
              // cacheDirectory: api.cachePath('jest'),
            });

            await runJest(toArgs(flags));
          },
        }),
      );
    },
  });
}

function toArgs(flags: {[key: string]: unknown}) {
  const args: string[] = [];

  for (const [key, value] of Object.entries(flags)) {
    if (typeof value === 'boolean') {
      if (value) {
        args.push(`--${key}`);
      }
    } else if (Array.isArray(value)) {
      args.push(...value.flatMap((subValue) => [`--${key}`, String(subValue)]));
    } else if (value != null) {
      if (typeof value === 'object') {
        args.push(`--${key}`, JSON.stringify(value));
      } else {
        args.push(`--${key}`, String(value));
      }
    }
  }

  return args;
}
