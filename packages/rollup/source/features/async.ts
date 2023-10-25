import {createHash} from 'crypto';
import {posix, sep} from 'path';

import type {Plugin, OutputChunk, OutputBundle} from 'rollup';
import {multiline} from '../shared/strings.ts';
import MagicString from 'magic-string';

const MODULE_PREFIX = '\0quilt-async-module:';
const IMPORT_PREFIX = '\0quilt-async-import:';

export interface Options {
  preload?: boolean;
  baseURL?: string;
  moduleID?(details: {imported: string}): string;
}

export function asyncModules({
  preload = true,
  baseURL = '/assets/',
  moduleID: getModuleID = defaultModuleID,
}: Options = {}): Plugin {
  return {
    name: '@quilted/async',
    async resolveId(id, importer) {
      if (id.startsWith(IMPORT_PREFIX)) return id;
      if (!id.startsWith(MODULE_PREFIX)) return null;

      const imported = id.replace(MODULE_PREFIX, '');

      const resolved = await this.resolve(imported, importer, {
        skipSelf: true,
      });

      if (resolved == null) return null;

      return `${MODULE_PREFIX}${resolved.id}`;
    },
    resolveDynamicImport(specifier) {
      if (
        typeof specifier === 'string' &&
        specifier.startsWith(IMPORT_PREFIX)
      ) {
        return specifier;
      }

      return null;
    },
    async load(id: string) {
      if (id.startsWith(MODULE_PREFIX)) {
        const imported = id.replace(MODULE_PREFIX, '');
        const moduleID = getModuleID({imported});

        const code = multiline`
          const id = ${JSON.stringify(moduleID)};

          const doImport = () => import(${JSON.stringify(
            `${IMPORT_PREFIX}${imported}`,
          )}).then((module) => module.default);

          export default function createAsyncModule(load) {
            return {
              id,
              import: () => load(doImport),
            };
          }
        `;

        return code;
      }

      if (id.startsWith(IMPORT_PREFIX)) {
        const imported = id.replace(IMPORT_PREFIX, '');
        const moduleID = getModuleID({imported});

        const code = multiline`
          import * as AsyncModule from ${JSON.stringify(imported)};

          ((globalThis[Symbol.for('quilt')] ??= {}).AsyncModules ??= new Map).set(${JSON.stringify(
            moduleID,
          )}, AsyncModule);

          export default AsyncModule;
        `;

        return {
          code,
          meta: {
            quilt: {moduleID},
          },
        };
      }

      return null;
    },
    transform: baseURL
      ? (code) =>
          code.replace(/__QUILT_ASSETS_BASE_URL__/g, JSON.stringify(baseURL))
      : undefined,
    async generateBundle(options, bundle) {
      if (preload) {
        switch (options.format) {
          case 'es': {
            await preloadAsyncAssetsInESMBundle(bundle);
            break;
          }
          case 'system': {
            await preloadAsyncAssetsInSystemJSBundle(bundle);
            break;
          }
        }
      }
    },
  };
}

function defaultModuleID({imported}: {imported: string}) {
  const name = imported.split(sep).pop()!.split('.')[0]!;

  const hash = createHash('sha256')
    .update(imported)
    .digest('hex')
    .substring(0, 8);

  return `${name}_${hash}`;
}

async function preloadAsyncAssetsInESMBundle(bundle: OutputBundle) {
  const {parse: parseImports} = await import('es-module-lexer');

  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    if (chunk.dynamicImports.length === 0) continue;

    const {code} = chunk;

    const newCode = new MagicString(code);

    const imports = (await parseImports(code))[0];

    for (const imported of imports) {
      const {s: start, e: end, d: dynamicStart} = imported;

      // es-module-lexer only sets `d >= 0` when the import is a dynamic one
      if (dynamicStart < 0) continue;

      // Get rid of the quotes
      const importSource = code.slice(start + 1, end - 1);

      const dependencies = getDependenciesForImport(
        importSource,
        chunk,
        bundle,
      );

      // The only dependency is the file itself, no need to preload
      if (dependencies.size === 1) continue;

      const originalImport = code.slice(dynamicStart, end + 1);
      newCode.overwrite(
        dynamicStart,
        end + 1,
        preloadContentForDependencies(dependencies, originalImport),
      );
    }

    chunk.code = newCode.toString();
  }
}

async function preloadAsyncAssetsInSystemJSBundle(bundle: OutputBundle) {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    if (chunk.dynamicImports.length === 0) continue;

    const {code} = chunk;

    const newCode = new MagicString(code);

    const systemDynamicImportRegex = /\bmodule\.import\(([^)]*)\)/g;

    let match: RegExpExecArray | null;

    while ((match = systemDynamicImportRegex.exec(code))) {
      const [originalImport, imported] = match;

      // Get rid of surrounding space and quotes
      const importSource = imported!.trim().slice(1, imported!.length - 1);

      const dependencies = getDependenciesForImport(
        importSource,
        chunk,
        bundle,
      );

      if (dependencies.size === 1) continue;

      newCode.overwrite(
        match.index,
        match.index + originalImport!.length,
        preloadContentForDependencies(dependencies, originalImport!),
      );
    }

    chunk.code = newCode.toString();
  }
}

function preloadContentForDependencies(
  dependencies: Iterable<string>,
  originalExpression: string,
) {
  return `Promise.resolve().then(() => globalThis[Symbol.for('quilt')]?.AsyncModules?.preload?.(${Array.from(
    dependencies,
  )
    .map((dependency) => JSON.stringify(dependency))
    .join(',')})).then(function(){return ${originalExpression}})`;
}

function getDependenciesForImport(
  imported: string,
  chunk: OutputChunk,
  bundle: OutputBundle,
) {
  const originalFilename = chunk.fileName;
  const dependencies = new Set<string>();
  const analyzed = new Set<string>();

  const normalizedFile = posix.join(posix.dirname(originalFilename), imported);

  const addDependencies = (filename: string) => {
    if (filename === originalFilename) return;
    if (analyzed.has(filename)) return;

    analyzed.add(filename);
    const chunk = bundle[filename];

    if (chunk == null) return;

    dependencies.add(chunk.fileName);

    if (chunk.type !== 'chunk') return;

    for (const imported of chunk.imports) {
      addDependencies(imported);
    }
  };

  addDependencies(normalizedFile);

  return dependencies;
}