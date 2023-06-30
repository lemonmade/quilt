import {readFile} from 'fs/promises';
import {DocumentNode, parse} from 'graphql';
import type {Plugin, TransformPluginContext} from 'rollup';

import {cleanDocument, extractImports, toSimpleDocument} from './transform.ts';

export function graphql(): Plugin {
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

      const document = toSimpleDocument(
        cleanDocument(loadedDocument, {
          removeUnused: {exclude: topLevelDefinitions},
        }),
      );

      return `export default JSON.parse(${JSON.stringify(
        JSON.stringify(document),
      )})`;
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
  const {imports, source} = extractImports(code);
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
