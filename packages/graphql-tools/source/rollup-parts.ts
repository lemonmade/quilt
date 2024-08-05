import {dirname} from 'path';
import {readFile, mkdir, writeFile} from 'fs/promises';

import {DocumentNode, parse} from 'graphql';
import type {Plugin, TransformPluginContext} from 'rollup';

import {
  cleanGraphQLDocument,
  extractGraphQLImports,
  toGraphQLOperation,
} from './transform.ts';

export interface Options {
  manifest?: string;
  format?: 'operation' | 'string';
  includeSource?: boolean;
  addTypename?: boolean;
}

export function graphql({
  manifest: manifestPath,
  format = 'operation',
  includeSource = true,
  addTypename = false,
}: Options = {}): Plugin {
  const shouldWriteManifest = Boolean(manifestPath);

  return {
    name: '@quilted/graphql',
    async transform(code, id) {
      if (!id.endsWith('.graphql') && !id.endsWith('.gql')) return null;

      const topLevelDefinitions = new Set<string>();

      const loadedDocument = await loadDocument(
        code,
        id,
        this,
        (document, level) => {
          if (level !== 0) return;

          for (const definition of document.definitions) {
            if ('name' in definition && definition.name != null) {
              topLevelDefinitions.add(definition.name.value);
            }
          }
        },
      );

      const document = toGraphQLOperation(
        cleanGraphQLDocument(loadedDocument, {
          removeUnused: {exclude: topLevelDefinitions},
        }),
        {addTypename},
      );

      let outputCode: string;

      if (format === 'operation') {
        outputCode = `export default JSON.parse(${JSON.stringify(
          JSON.stringify(includeSource ? document : {...document, source: ''}),
        )})`;
      } else {
        const {source, ...rest} = document;

        outputCode = [
          `const operation = new String(${JSON.stringify(includeSource ? source : '')});`,
          `Object.assign(operation, ${JSON.stringify(rest)});`,
          `export default operation;`,
        ].join('\n');
      }

      return {
        code: outputCode,
        meta: shouldWriteManifest
          ? {
              quilt: {graphql: document},
            }
          : undefined,
      };
    },
    async generateBundle() {
      if (!shouldWriteManifest) return;

      const operations: Record<string, string> = {};

      for (const moduleId of this.getModuleIds()) {
        const operation = this.getModuleInfo(moduleId)?.meta?.quilt?.graphql;

        if (
          operation != null &&
          typeof operation.id === 'string' &&
          typeof operation.source === 'string'
        ) {
          operations[operation.id] = operation.source;
        }
      }

      await mkdir(dirname(manifestPath!), {recursive: true});
      await writeFile(manifestPath!, JSON.stringify(operations, null, 2));
    },
  };
}

async function loadDocument(
  code: string,
  file: string,
  plugin: TransformPluginContext,
  add?: (document: DocumentNode, level: number) => void,
  level = 0,
  seen = new Set<string>(),
) {
  const {imports, source} = extractGraphQLImports(code);
  const document = parse(source);

  add?.(document, level);

  if (imports.length === 0) {
    return document;
  }

  const resolvedImports = await Promise.all(
    imports.map(async (imported) => {
      if (seen.has(imported)) return;

      seen.add(imported);

      const resolvedId = await plugin.resolve(imported, file);

      if (resolvedId == null) {
        throw new Error(
          `Could not find ${JSON.stringify(imported)} from ${JSON.stringify(
            file,
          )}`,
        );
      }

      plugin.addWatchFile(resolvedId.id);
      const contents = await readFile(resolvedId.id, {
        encoding: 'utf8',
      });

      return loadDocument(
        contents,
        resolvedId.id,
        plugin,
        add,
        level + 1,
        seen,
      );
    }),
  );

  for (const importedDocument of resolvedImports) {
    if (importedDocument == null) continue;
    (document.definitions as any[]).push(...importedDocument.definitions);
  }

  return document;
}
