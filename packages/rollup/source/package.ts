import * as path from 'path';
import {Plugin, type RollupOptions} from 'rollup';
import {glob} from 'glob';
import {fileURLToPath} from 'url';

import {loadPackageJSON, type PackageJSON} from './shared/package-json.ts';

export interface PackageOptions {
  /**
   * The root directory containing the source code for your application.
   */
  root?: string | URL;
}

export async function quiltPackageESModules({
  root: rootPath = process.cwd(),
}: PackageOptions = {}) {
  const root = fileURLToPath(rootPath);
  const outputDirectory = path.join(root, 'build/esm');

  const [{sourceCode}, packageJSON] = await Promise.all([
    import('./features/source-code.ts'),
    loadPackageJSON(root),
  ]);

  const [entries] = await Promise.all([
    sourceEntriesForPackage(root, packageJSON),
  ]);

  let sourceRoot = root;

  for (const entry of Object.values(entries)) {
    if (!entry.startsWith(root)) continue;

    sourceRoot = path.resolve(
      root,
      path.relative(root, entry).split(path.sep)[0] ?? '.',
    );
    break;
  }

  const plugins: Plugin[] = [sourceCode({mode: 'production'})];

  return {
    input: entries,
    plugins,
    onwarn(warning, defaultWarn) {
      // Removes annoying warnings for React-focused libraries that
      // include 'use client' directives.
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        /['"]use client['"]/.test(warning.message)
      ) {
        return;
      }

      defaultWarn(warning);
    },
    output: {
      preserveModules: true,
      preserveModulesRoot: sourceRoot,
      format: 'esm',
      dir: outputDirectory,
      entryFileNames: `[name].mjs`,
      assetFileNames: `[name].[ext]`,
      // chunkFileNames: createChunkNamer({
      //   extension: ESM_EXTENSION,
      //   sourceRoot: sourceRootDirectory,
      // }),
    },
  } satisfies RollupOptions;
}

async function sourceEntriesForPackage(root: string, packageJSON: PackageJSON) {
  const {main, exports} = packageJSON;

  const entries: Record<string, string> = {};

  if (typeof main === 'string') {
    entries['.'] = await resolveTargetFileAsSource(main, root);
  }

  if (typeof exports === 'string') {
    entries['.'] = await resolveTargetFileAsSource(exports, root);
    return entries;
  } else if (exports == null || typeof exports !== 'object') {
    return entries;
  }

  for (const [exportPath, exportCondition] of Object.entries(
    exports as Record<string, null | string | Record<string, string>>,
  )) {
    let targetFile: string | null | undefined = null;

    if (exportCondition == null) continue;

    if (typeof exportCondition === 'string') {
      targetFile = exportCondition;
    } else {
      targetFile ??=
        exportCondition['source'] ??
        exportCondition['quilt:source'] ??
        exportCondition['quilt:esnext'] ??
        Object.values(exportCondition).find(
          (condition) =>
            typeof condition === 'string' && condition.startsWith('./build/'),
        );
    }

    if (targetFile == null) continue;

    const sourceFile = await resolveTargetFileAsSource(targetFile, root);

    entries[exportPath] = sourceFile;
  }

  return entries;
}

async function resolveTargetFileAsSource(file: string, root: string) {
  const sourceFile = file.includes('/build/')
    ? (
        await glob(
          file
            .replace(/[/]build[/][^/]+[/]/, '/*/')
            .replace(/(\.d\.ts|\.[\w]+)$/, '.*'),
          {
            cwd: root,
            absolute: true,
            ignore: [path.resolve(root, file)],
          },
        )
      )[0]!
    : path.resolve(root, file);

  return sourceFile;
}
