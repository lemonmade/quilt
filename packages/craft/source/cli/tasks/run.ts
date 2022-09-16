import {createRequire} from 'module';
import {ChildProcess, spawn} from 'child_process';
import arg from 'arg';

import {Task, DiagnosticError} from '../../kit';
import type {Project} from '../../kit';
import type {} from '../../tools/typescript';

import {Ui} from '../ui';
import {
  logError,
  loadWorkspace,
  loadPluginsForTask,
  createFilter,
  getNodeExecutable,
} from '../common';
import {sourceEntriesForProject} from '../../features/packages';
import type {JestProjectConfig} from '../../tools/jest';

const VALID_TOOLS = new Set([
  'prettier',
  'eslint',
  'stylelint',
  'tsc',
  'typescript',
  'jest',
]);

const DEFAULT_STYLELINT_EXTENSIONS = ['.css'];
const DEFAULT_ESLINT_EXTENSIONS = ['.mjs', '.cjs', '.js'];
export const DEFAULT_PRETTIER_EXTENSIONS = [
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.graphql',
  '.gql',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
  '.vue',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
];

const JEST_RESOLVER_MODULE = '@quilted/craft/jest/resolver.cjs';

const require = createRequire(import.meta.url);

export async function run(argv: string[]) {
  const ui = new Ui();
  const [tool, ...args] = argv;

  try {
    if (tool == null) {
      throw new DiagnosticError({title: 'No tool was provided'});
    }

    if (!VALID_TOOLS.has(tool)) {
      throw new DiagnosticError({
        title: `Unknown tool: ${tool}. Must be one of the following: ${Array.from(
          VALID_TOOLS,
        ).join(', ')}`,
      });
    }

    switch (tool) {
      case 'prettier': {
        const {'--write': write, _: otherArgs} = arg(
          {
            '--write': Boolean,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const shouldPassthroughCommand =
          Boolean(otherArgs[0]) &&
          new Set([
            '-v',
            '--version',
            '-h',
            '--help',
            '--find-config-path',
          ]).has(otherArgs[0]!);

        if (shouldPassthroughCommand) {
          const child = spawn(
            getNodeExecutable('prettier', import.meta.url),
            otherArgs,
            {
              stdio: 'inherit',
              env: {...process.env, FORCE_COLOR: '1'},
            },
          );

          await runChild(child);
          break;
        }

        const fix = Boolean(write);

        const {plugins, workspace} = await loadWorkspace(process.cwd());
        const {configurationForWorkspace} = await loadPluginsForTask(
          Task.Lint,
          {
            ui,
            filter: createFilter(),
            plugins,
            workspace,
            options: {fix},
            coreHooksForProject: () => ({}),
            coreHooksForWorkspace: () => ({}),
          },
        );

        const hasGlob = Boolean(otherArgs[0]) && !otherArgs[0]!.startsWith('-');

        const {prettierExtensions} = await configurationForWorkspace();
        const [extensions] = await Promise.all([
          hasGlob
            ? []
            : prettierExtensions?.run(DEFAULT_PRETTIER_EXTENSIONS) ??
              DEFAULT_PRETTIER_EXTENSIONS,
        ]);

        const globArgument =
          hasGlob || extensions.length === 0
            ? []
            : [
                extensions.length === 1
                  ? `./**/*.${stripLeadingDot(extensions[0]!)}`
                  : `./**/*.{${extensions
                      .map((extension) => stripLeadingDot(extension))
                      .join(',')}}`,
              ];

        const child = spawn(
          getNodeExecutable('prettier', import.meta.url, workspace.root),
          [
            ...globArgument,
            ...otherArgs,
            fix ? '--write' : '--check',
            ...(otherArgs.includes('--no-error-on-unmatched-pattern')
              ? []
              : ['--no-error-on-unmatched-pattern']),
          ],
          {
            stdio: 'inherit',
          },
        );

        await runChild(child);
        break;
      }
      case 'eslint': {
        const {
          '--fix': explicitFix,
          '--fix-dry-run': explicitFixDryRun,
          '--ext': explicitExtensions,
          '--no-cache': explicitNoCache,
          '--cache': explicitCache,
          '--cache-location': explicitCacheLocation,
          '--max-warnings': explicitMaxWarnings,
          _: otherArgs,
        } = arg(
          {
            '--fix': Boolean,
            '--fix-dry-run': Boolean,
            '--ext': [String],
            '--no-cache': Boolean,
            '--cache': Boolean,
            '--cache-location': String,
            '--max-warnings': Number,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const shouldPassthroughCommand =
          Boolean(otherArgs[0]) &&
          new Set(['-v', '--version', '-h', '--help', '--init']).has(
            otherArgs[0]!,
          );

        if (shouldPassthroughCommand) {
          const child = spawn(
            getNodeExecutable('eslint', import.meta.url),
            otherArgs,
            {
              stdio: 'inherit',
              env: {...process.env, FORCE_COLOR: '1'},
            },
          );

          await runChild(child);
          break;
        }

        const {plugins, workspace} = await loadWorkspace(process.cwd());
        const {configurationForWorkspace} = await loadPluginsForTask(
          Task.Lint,
          {
            ui,
            filter: createFilter(),
            plugins,
            workspace,
            options: {fix: explicitFix ?? false},
            coreHooksForProject: () => ({}),
            coreHooksForWorkspace: () => ({}),
          },
        );

        const {eslintExtensions} = await configurationForWorkspace();
        const [extensions] = await Promise.all([
          explicitExtensions ??
            eslintExtensions?.run(DEFAULT_ESLINT_EXTENSIONS),
        ]);

        const hasExplicitTarget =
          Boolean(otherArgs[0]) && !otherArgs[0]!.startsWith('-');

        const child = spawn(
          getNodeExecutable('eslint', import.meta.url, workspace.root),
          [
            ...(hasExplicitTarget ? otherArgs : ['.', ...otherArgs]),
            '--max-warnings',
            explicitMaxWarnings ? String(explicitMaxWarnings) : '0',
            ...(explicitCache ?? !explicitNoCache
              ? [
                  '--cache',
                  '--cache-location',
                  explicitCacheLocation ?? // ESLint requires the trailing slash, don’t remove it
                    // @see https://eslint.org/docs/user-guide/command-line-interface#-cache-location
                    `${workspace.fs.temporaryPath('eslint/cache')}/`,
                ]
              : []),
            ...(explicitFix ?? false ? ['--fix'] : []),
            ...(explicitFixDryRun ?? false ? ['--fix-dry-run'] : []),
            ...(extensions
              ? extensions.map((ext) => ['--ext', ext]).flat()
              : []),
          ],
          {
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: '1',
            },
          },
        );

        await runChild(child);
        break;
      }
      case 'stylelint': {
        const {
          '--fix': explicitFix,
          '--ext': explicitExtensions,
          '--no-cache': explicitNoCache,
          '--cache': explicitCache,
          '--cache-location': explicitCacheLocation,
          '--max-warnings': explicitMaxWarnings,
          _: otherArgs,
        } = arg(
          {
            '--fix': Boolean,
            '--ext': [String],
            '--no-cache': Boolean,
            '--cache': Boolean,
            '--cache-location': String,
            '--max-warnings': Number,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const shouldPassthroughCommand =
          Boolean(otherArgs[0]) &&
          new Set(['-v', '--version', '-h', '--help']).has(otherArgs[0]!);

        if (shouldPassthroughCommand) {
          const child = spawn(
            getNodeExecutable('stylelint', import.meta.url),
            otherArgs,
            {
              stdio: 'inherit',
              env: {...process.env, FORCE_COLOR: '1'},
            },
          );

          await runChild(child);
          break;
        }

        const {plugins, workspace} = await loadWorkspace(process.cwd());
        const {configurationForWorkspace} = await loadPluginsForTask(
          Task.Lint,
          {
            ui,
            filter: createFilter(),
            plugins,
            workspace,
            options: {fix: explicitFix ?? false},
            coreHooksForProject: () => ({}),
            coreHooksForWorkspace: () => ({}),
          },
        );

        const {stylelintExtensions} = await configurationForWorkspace();
        const [extensions] = await Promise.all([
          explicitExtensions ??
            stylelintExtensions?.run(DEFAULT_STYLELINT_EXTENSIONS) ??
            DEFAULT_STYLELINT_EXTENSIONS,
        ]);

        const hasExplicitTarget =
          Boolean(otherArgs[0]) && !otherArgs[0]!.startsWith('-');

        const child = spawn(
          getNodeExecutable('stylelint', import.meta.url, workspace.root),
          [
            ...(hasExplicitTarget
              ? otherArgs
              : [
                  `**/*.${
                    extensions.length === 1
                      ? stripLeadingDot(extensions[0]!)
                      : extensions.map(stripLeadingDot).join(',')
                  }`,
                  ...otherArgs,
                ]),
            '--max-warnings',
            explicitMaxWarnings ? String(explicitMaxWarnings) : '0',
            ...(explicitCache ?? !explicitNoCache
              ? [
                  '--cache',
                  '--cache-location',
                  explicitCacheLocation ??
                    workspace.fs.temporaryPath('stylelint/cache'),
                ]
              : []),
            ...(explicitFix ?? false ? ['--fix'] : []),
          ],
          {
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: '1',
            },
          },
        );

        await runChild(child);
        break;
      }
      case 'tsc':
      case 'typescript': {
        const {'--no-build': noBuild, _: otherArgs} = arg(
          {'--no-build': Boolean},
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const shouldPassthroughCommand =
          Boolean(otherArgs[0]) &&
          new Set([
            '-v',
            '--version',
            '-h',
            '--help',
            '--init',
            '--showConfig',
          ]).has(otherArgs[0]!);

        if (shouldPassthroughCommand) {
          const child = spawn(
            getNodeExecutable('tsc', import.meta.url),
            otherArgs,
            {
              stdio: 'inherit',
              env: {...process.env, FORCE_COLOR: '1'},
            },
          );

          await runChild(child);
          break;
        }

        const {plugins, workspace} = await loadWorkspace(process.cwd());
        const {configurationForWorkspace} = await loadPluginsForTask(
          Task.TypeCheck,
          {
            ui,
            filter: createFilter(),
            plugins,
            workspace,
            options: {},
            coreHooksForProject: () => ({}),
            coreHooksForWorkspace: () => ({}),
          },
        );

        const {typescriptHeap} = await configurationForWorkspace();
        const heap = await typescriptHeap?.run(undefined);
        const heapOption = heap ? `--max-old-space-size=${heap}` : undefined;

        const child = spawn(
          getNodeExecutable('tsc', import.meta.url, workspace.root),
          [...(noBuild ? [] : '--build'), ...otherArgs],
          {
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: '1',
              NODE_OPTIONS: heapOption,
            },
          },
        );

        await runChild(child);
        break;
      }
      case 'jest': {
        const {
          '--watch': explicitWatch,
          '--watchAll': explicitWatchAll,
          _: otherArgs,
        } = arg(
          {
            '--watch': Boolean,
            '--watchAll': Boolean,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const shouldPassthroughCommand =
          Boolean(otherArgs[0]) &&
          new Set(['-v', '--version', '-h', '--help', '--init']).has(
            otherArgs[0]!,
          );

        if (shouldPassthroughCommand) {
          const child = spawn(
            getNodeExecutable('jest', import.meta.url),
            otherArgs,
            {
              stdio: 'inherit',
            },
          );

          await runChild(child);
          break;
        }

        const watch = explicitWatch ?? explicitWatchAll ?? false;
        const debug = false;
        const excludePatterns: readonly string[] = [];
        const includePatterns: readonly string[] = [];

        const {plugins, workspace} = await loadWorkspace(process.cwd());
        const {configurationForWorkspace, configurationForProject} =
          await loadPluginsForTask(Task.Test, {
            ui,
            filter: createFilter(),
            plugins,
            workspace,
            options: {
              watch,
              debug,
              excludePatterns,
              includePatterns,
            },
            coreHooksForProject: () => ({}),
            coreHooksForWorkspace: () => ({}),
          });

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
        ] = await Promise.all([
          import('jest-config'),
          configurationForWorkspace(),
        ]);

        const truthyEnvValues = new Set(['true', '1']);
        const isCi = [process.env.CI, process.env.GITHUB_ACTIONS].some(
          (envVar) => Boolean(envVar) && truthyEnvValues.has(envVar!),
        );

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
            resolver: JEST_RESOLVER_MODULE,
            cacheDirectory: workspace.fs.temporaryPath('jest/cache'),
          });

          return config;
        })();

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
              } = await configurationForProject(project);

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
                resolver: JEST_RESOLVER_MODULE,
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

        const child = spawn(
          getNodeExecutable('jest', import.meta.url, workspace.root),
          // TODO: we need to merge the explicit flags and the ones from Quilt more elegantly.
          [...includePatterns, ...otherArgs, ...toArgs(flags)],
          {
            stdio: 'inherit',
          },
        );

        await runChild(child);
        break;
      }
    }
  } catch (error) {
    logError(error, ui);
    process.exitCode = 1;
    return;
  }
}

async function runChild(child: ChildProcess) {
  await new Promise<void>((resolve, reject) => {
    child.on('close', () => {
      resolve();
    });

    child.on('error', (error) => {
      reject(error);
    });
  });

  process.exitCode = child.exitCode ?? 0;
}

function stripLeadingDot(extension: string) {
  return extension.startsWith('.') ? extension.slice(1) : extension;
}

// JEST

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

    return cached!;
  };
}
