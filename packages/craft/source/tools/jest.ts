import {createRequire} from 'module';

import type {Config} from '@jest/types';

import {createWorkspacePlugin} from '../kit';
import type {WaterfallHook, Project} from '../kit';

import {sourceEntriesForProject} from '../features/packages';

export type JestConfig = Config.InitialOptions;
export type JestProjectConfig = Config.InitialProjectOptions;

export interface JestProjectHooks {
  jestExtensions: WaterfallHook<string[]>;
  jestEnvironment: WaterfallHook<string | undefined>;
  jestModuleMapper: WaterfallHook<Record<string, string>>;
  jestSetupEnv: WaterfallHook<string[]>;
  jestSetupTests: WaterfallHook<string[]>;
  jestTransforms: WaterfallHook<
    Record<string, string | [string, Record<string, any>]>
  >;
  jestTestMatch: WaterfallHook<string[]>;
  jestConfig: WaterfallHook<JestConfig>;
  jestIgnore: WaterfallHook<string[]>;
  jestWatchIgnore: WaterfallHook<string[]>;
}

// @see https://jestjs.io/docs/next/configuration
export interface JestFlags {
  ci?: boolean;
  config?: string;
  watch?: boolean;
  watchAll?: boolean;
  testNamePattern?: string;
  testPathPattern?: string;
  testPathIgnorePatterns?: string;
  runInBand?: boolean;
  forceExit?: boolean;
  maxWorkers?: number;
  onlyChanged?: boolean;
  coverage?: boolean;
  updateSnapshot?: boolean;
  cacheDirectory?: string;
  passWithNoTests?: boolean;
  detectOpenHandles?: boolean;
  [key: string]: unknown;
}

export interface JestWorkspaceHooks
  extends Omit<JestProjectHooks, 'jestConfig'> {
  jestConfig: WaterfallHook<JestConfig>;
  jestFlags: WaterfallHook<JestFlags>;
  jestWatchPlugins: WaterfallHook<string[]>;
}

declare module '@quilted/sewing-kit' {
  interface TestProjectConfigurationHooks extends JestProjectHooks {}
  interface TestWorkspaceConfigurationHooks extends JestWorkspaceHooks {}
}

const RESOLVER_MODULE = '@quilted/craft/jest/resolver.cjs';

const require = createRequire(import.meta.url);

/**
 * Adds a collection of hooks to the workspace and all its projects
 * for running Jest, and configures Jest to run for this workspace.
 */
export function jest() {
  return createWorkspacePlugin({
    name: 'Quilt.Jest',
    test({workspace, hooks, run, project, options}) {
      hooks<JestWorkspaceHooks>(({waterfall}) => ({
        jestConfig: waterfall(),
        jestFlags: waterfall(),
        jestWatchPlugins: waterfall(),
        jestEnvironment: waterfall(),
        jestExtensions: waterfall(),
        jestModuleMapper: waterfall(),
        jestSetupEnv: waterfall(),
        jestSetupTests: waterfall(),
        jestTestMatch: waterfall(),
        jestTransforms: waterfall(),
        jestIgnore: waterfall(),
        jestWatchIgnore: waterfall(),
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
          jestIgnore: waterfall(),
          jestWatchIgnore: waterfall(),
        }));
      });

      run((step, {configuration, projectConfiguration}) =>
        step({
          name: 'Quilt.Jest',
          label: 'Run Jest',
          async run(runner) {
            const getEntryAliases = createCachedEntryAliasesGetter();

            const [
              {defaults},
              {
                jestConfig,
                jestFlags,
                jestWatchPlugins,
                jestTestMatch,
                jestEnvironment,
                jestExtensions,
                jestModuleMapper,
                jestSetupEnv,
                jestSetupTests,
                jestTransforms,
                jestIgnore,
                jestWatchIgnore,
              },
            ] = await Promise.all([import('jest-config'), configuration()]);

            const truthyEnvValues = new Set(['true', '1']);
            const isCi = [process.env.CI, process.env.GITHUB_ACTIONS].some(
              (envVar) => Boolean(envVar) && truthyEnvValues.has(envVar!),
            );

            const {watch, debug, includePatterns, excludePatterns} = options;

            // We create an alias map of the repo’s internal packages. This prevents
            // issues where Jest might try to use the built output for a package (as
            // the package.json usually specifies those outputs as the entry for the
            // package), even though the outputs might be from an older build.
            const internalModuleMap: Record<string, string> = {};

            await Promise.all(
              workspace.projects.map(async (project) => {
                const entryAliases = await getEntryAliases(project);
                Object.assign(internalModuleMap, entryAliases);
              }),
            );

            const ignorePatternsFromOptions = excludePatterns.map(
              (pattern) => `/${pattern.replace(/(^"|"$)/, '')}/`,
            );

            const workspaceProject = await (async () => {
              const [
                environment,
                testIgnore,
                watchIgnore,
                transform,
                extensions,
                moduleMapper,
                setupEnvironmentFiles,
                setupTestsFiles,
              ] = await Promise.all([
                // TODO should this be inferred...
                jestEnvironment!.run('node'),
                jestIgnore!.run([
                  ...defaults.testPathIgnorePatterns,
                  ...ignorePatternsFromOptions,
                  ...workspace.projects.map((project) =>
                    project.root.replace(workspace.root, '<rootDir>'),
                  ),
                ]),
                jestWatchIgnore!.run([
                  ...defaults.watchPathIgnorePatterns,
                  workspace.fs.buildPath(),
                ]),
                jestTransforms!.run({}),
                jestExtensions!.run(
                  defaults.moduleFileExtensions.map((ext) =>
                    ext.startsWith('.') ? ext : `.${ext}`,
                  ),
                ),
                jestModuleMapper!.run({...internalModuleMap}),
                jestSetupEnv!.run([]),
                jestSetupTests!.run([]),
              ]);

              const normalizedExtensions = extensions.map((extension) =>
                extension.replace(/^\./, ''),
              );

              const testRegex = await jestTestMatch!.run([
                `.+\\.test\\.(${normalizedExtensions.join('|')})$`,
              ]);

              const config = await jestConfig!.run({
                displayName: 'workspace',
                rootDir: workspace.root,
                testRegex,
                testPathIgnorePatterns: testIgnore,
                moduleFileExtensions: normalizedExtensions,
                testEnvironment: environment,
                moduleNameMapper: moduleMapper,
                setupFiles: setupEnvironmentFiles,
                setupFilesAfterEnv: setupTestsFiles,
                watchPathIgnorePatterns: watchIgnore,
                transform,
                resolver: RESOLVER_MODULE,
                cacheDirectory: workspace.fs.temporaryPath('jest/cache'),
              });

              return config;
            })();

            const getSourceAliasesForProjectDependencies = async (
              project: Project,
            ) => {
              const aliases: Record<string, string> = {};

              for (const otherProject of workspace.projects) {
                const name = otherProject.packageJson?.name;

                if (name == null || !project.hasDependency(name, {all: true}))
                  continue;

                const projectAliases = await getEntryAliases(otherProject);
                Object.assign(aliases, projectAliases);
              }

              return aliases;
            };

            const projects = await Promise.all(
              workspace.projects.map(
                async (project): Promise<JestProjectConfig> => {
                  const {
                    jestConfig,
                    jestTestMatch,
                    jestEnvironment,
                    jestExtensions,
                    jestModuleMapper,
                    jestSetupEnv,
                    jestSetupTests,
                    jestTransforms,
                    jestIgnore,
                    jestWatchIgnore,
                  } = await projectConfiguration(project);

                  // TODO move to craft
                  // const [
                  //   setupEnvironment,
                  //   setupEnvironmentIndexes,
                  //   setupTests,
                  //   setupTestsIndexes,
                  // ] = await Promise.all([
                  //   project.fs.glob('tests/setup/environment.*'),
                  //   project.fs.glob('tests/setup/environment/index.*'),
                  //   project.fs.glob('tests/setup/tests.*'),
                  //   project.fs.glob('tests/setup/tests/index.*'),
                  // ]);

                  const [
                    environment,
                    testIgnore,
                    watchIgnore,
                    transform,
                    extensions,
                    moduleMapper,
                    setupEnvironmentFiles,
                    setupTestsFiles,
                  ] = await Promise.all([
                    // TODO should this be inferred...
                    jestEnvironment!.run('node'),
                    jestIgnore!.run([
                      ...defaults.testPathIgnorePatterns,
                      ...ignorePatternsFromOptions,
                      project.fs.buildPath().replace(project.root, '<rootDir>'),
                    ]),
                    jestWatchIgnore!.run([
                      ...defaults.watchPathIgnorePatterns,
                      project.fs.buildPath(),
                    ]),
                    jestTransforms!.run({}),
                    jestExtensions!.run(
                      defaults.moduleFileExtensions.map((ext) =>
                        ext.startsWith('.') ? ext : `.${ext}`,
                      ),
                    ),
                    jestModuleMapper!.run(
                      await getSourceAliasesForProjectDependencies(project),
                    ),
                    jestSetupEnv!.run([]),
                    jestSetupTests!.run([]),
                  ]);

                  const normalizedExtensions = extensions.map((extension) =>
                    extension.replace(/^\./, ''),
                  );

                  const testRegex = await jestTestMatch!.run([
                    `.+\\.test\\.(${normalizedExtensions.join('|')})$`,
                  ]);

                  const projectConfig = await jestConfig!.run({
                    displayName: project.name,
                    rootDir: project.root,
                    testRegex,
                    testPathIgnorePatterns: testIgnore,
                    moduleFileExtensions: normalizedExtensions,
                    testEnvironment: environment,
                    moduleNameMapper: moduleMapper,
                    setupFiles: setupEnvironmentFiles,
                    setupFilesAfterEnv: setupTestsFiles,
                    watchPathIgnorePatterns: watchIgnore,
                    transform,
                    resolver: RESOLVER_MODULE,
                    cacheDirectory: project.fs.temporaryPath('jest/cache'),
                  });

                  return projectConfig;
                },
              ),
            );

            const [watchPlugins] = await Promise.all([
              jestWatchPlugins!.run([
                // These are so useful, they should be on by default. Sue me.
                require.resolve('jest-watch-typeahead/filename'),
                require.resolve('jest-watch-typeahead/testname'),
              ]),
            ]);

            const config = await jestConfig!.run({
              rootDir: workspace.root,
              projects: [workspaceProject, ...projects],
              watch,
              watchPlugins,
              testPathIgnorePatterns:
                excludePatterns.length > 0
                  ? [
                      '/node_modules/',
                      ...excludePatterns.map(
                        (pattern) => `/${pattern.replace(/(^"|"$)/g, '')}/`,
                      ),
                    ]
                  : undefined,
            });

            const configPath = workspace.fs.temporaryPath('jest/config.mjs');

            await workspace.fs.write(
              configPath,
              `export default ${JSON.stringify(config, null, 2)};`,
            );

            const isFocused =
              includePatterns.length > 0 || excludePatterns.length > 0;

            const flags = await jestFlags!.run({
              ci: isCi ? isCi : undefined,
              config: configPath,
              all: true,
              // coverage,
              watch: watch && !isFocused,
              watchAll: watch && isFocused,
              onlyChanged: !isCi && !isFocused,
              passWithNoTests: true,
              forceExit: isCi || debug,
              runInBand: debug,
              detectOpenHandles: debug,
            });

            const spawned = runner.spawn(
              'jest',
              [...includePatterns, ...toArgs(flags)],
              {
                stdio: 'inherit',
                fromNodeModules: import.meta.url,
              },
            );

            if (!watch) {
              await new Promise<void>((resolve) => {
                spawned.on('exit', () => resolve());
              });

              if (spawned.exitCode !== 0) {
                runner.fail();
              }
            }
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

function createCachedEntryAliasesGetter(): (
  project: Project,
) => Promise<Record<string, string>> {
  const cache = new Map<Project, Promise<Record<string, string>>>();

  return (project) => {
    let cached = cache.get(project);

    if (cached == null) {
      cached = sourceEntriesForProject(project, {
        conditions: ['node'],
      }).then((entries) => {
        const normalizedEntries: Record<string, string> = {};

        for (const [entry, source] of Object.entries(entries)) {
          const name = project.packageJson?.name ?? project.name;
          const aliasEntry = `^${name}${
            entry === '.' ? '' : `/${entry.slice(2)}`
          }$`;
          normalizedEntries[aliasEntry] = source;
        }

        return normalizedEntries;
      });
      cache.set(project, cached);
    }

    return cached;
  };
}
