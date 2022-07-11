import {spawn} from 'child_process';
import arg from 'arg';

import {Task, DiagnosticError} from '../../kit';
import type {} from '../../tools/typescript';

import {Ui} from '../ui';
import {
  logError,
  loadWorkspace,
  loadPluginsForTask,
  createFilter,
  getNodeExecutable,
} from '../common';

const VALID_TOOLS = new Set(['prettier', 'eslint', 'tsc', 'typescript']);

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

    const {plugins, workspace} = await loadWorkspace(process.cwd());

    switch (tool) {
      case 'prettier': {
        const {'--write': write} = arg(
          {
            '--write': Boolean,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

        const fix = Boolean(write);

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

        const {prettierExtensions} = await configurationForWorkspace();
        const [extensions] = await Promise.all([
          prettierExtensions?.run(DEFAULT_PRETTIER_EXTENSIONS) ??
            DEFAULT_PRETTIER_EXTENSIONS,
        ]);

        const glob =
          extensions.length === 1
            ? `./**/*.${stripLeadingDot(extensions[0]!)}`
            : `./**/*.{${extensions
                .map((extension) => stripLeadingDot(extension))
                .join(',')}}`;

        const child = spawn(
          getNodeExecutable('prettier', import.meta.url, workspace.root),
          [
            glob,
            fix ? '--write' : '--check',
            '--no-error-on-unmatched-pattern',
          ],
          {
            stdio: 'inherit',
          },
        );

        await new Promise<void>((resolve, reject) => {
          child.on('close', () => {
            resolve();
          });

          child.on('error', (error) => {
            reject(error);
          });
        });

        process.exitCode = child.exitCode ?? 0;

        break;
      }
      case 'eslint': {
        const {
          '--fix': explicitFix,
          '--ext': explicitExtensions,
          '--cache': explicitCache,
          '--cache-location': explicitCacheLocation,
          '--max-warnings': explicitMaxWarnings,
        } = arg(
          {
            '--fix': Boolean,
            '--ext': [String],
            '--cache': Boolean,
            '--cache-location': String,
            '--max-warnings': Number,
          },
          {argv: args, permissive: true, stopAtPositional: false},
        );

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

        const child = spawn(
          getNodeExecutable('eslint', import.meta.url, workspace.root),
          [
            '.',
            '--max-warnings',
            explicitMaxWarnings ? String(explicitMaxWarnings) : '0',
            ...(explicitCache ?? true
              ? [
                  '--cache',
                  '--cache-location',
                  explicitCacheLocation ?? // ESLint requires the trailing slash, don’t remove it
                    // @see https://eslint.org/docs/user-guide/command-line-interface#-cache-location
                    `${workspace.fs.temporaryPath('eslint/cache')}/`,
                ]
              : []),
            ...(explicitFix ?? false ? ['--fix'] : []),
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

        await new Promise<void>((resolve, reject) => {
          child.on('close', () => {
            resolve();
          });

          child.on('error', (error) => {
            reject(error);
          });
        });

        process.exitCode = child.exitCode ?? 0;

        break;
      }
      case 'tsc':
      case 'typescript': {
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
          ['--build', '--pretty'],
          {
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: '1',
              NODE_OPTIONS: heapOption,
            },
          },
        );

        await new Promise<void>((resolve, reject) => {
          child.on('close', () => {
            resolve();
          });

          child.on('error', (error) => {
            reject(error);
          });
        });

        process.exitCode = child.exitCode ?? 0;
        break;
      }
    }
  } catch (error) {
    logError(error, ui);
    process.exitCode = 1;
    return;
  }
}

function stripLeadingDot(extension: string) {
  return extension.startsWith('.') ? extension.slice(1) : extension;
}
