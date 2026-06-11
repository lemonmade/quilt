import {dirname} from 'path';
import {readFile, mkdir, writeFile} from 'fs/promises';

import {parse, type DocumentNode} from 'graphql';
import type {Plugin, TransformPluginContext} from 'rollup';

import {
  toGraphQLOperation,
  cleanGraphQLDocument,
  extractGraphQLImports,
} from './graphql/transform.ts';

export interface GraphQLOptions {
  /**
   * Whether to write a manifest mapping each operation's `id` (a SHA-256
   * hash of its normalized source) to its source text. Pass `true` to write
   * the manifest to `manifests/graphql.json`, or a string to control the
   * path. The manifest is the artifact a server consumes to execute
   * "persisted" operations, where clients send only the operation's `id`.
   */
  manifest?: string | boolean;
  addTypename?: boolean;

  /**
   * Whether the transformed `.graphql` modules include the operation's
   * `source` text. Defaults to `true`.
   *
   * Set this to `false` for builds using "persisted" GraphQL operations:
   * each emitted module then contains only the operation's `id`, `type`,
   * and `name`, keeping the query text out of the resulting JavaScript
   * bundles entirely. Pair this with the `manifest` option, which still
   * receives the full source for every operation (so your server can map
   * `id` back to the executable document), and with the `source` option of
   * `createGraphQLFetch()`, which omits the missing source from requests.
   *
   * Documents containing only fragments keep their source regardless of
   * this option — they can't be executed on their own, and only exist at
   * runtime to be inlined into the operations that `#import` them.
   */
  source?: boolean;
}

export function graphql({
  manifest,
  addTypename,
  source: includeSource = true,
}: GraphQLOptions = {}): Plugin {
  const shouldWriteManifest = Boolean(manifest);
  const manifestPath =
    typeof manifest === 'string' ? manifest : `manifests/graphql.json`;

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

      // When the operation source is omitted from the module, the manifest
      // (attached to module meta below) still carries it, so the persisted
      // operation map always contains the executable document.
      const moduleContent =
        includeSource || document.type == null
          ? document
          : {id: document.id, type: document.type, name: document.name};

      return {
        code: `export default JSON.parse(${JSON.stringify(
          JSON.stringify(moduleContent),
        )})`,
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

      if (Object.keys(operations).length === 0) return;

      await mkdir(dirname(manifestPath), {recursive: true});
      await writeFile(manifestPath, JSON.stringify(operations, null, 2));
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
