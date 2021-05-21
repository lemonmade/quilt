import {readFile} from 'fs/promises';
import {parse} from 'graphql';
import type {Plugin, TransformPluginContext} from 'rollup';

import {cleanDocument, extractImports, toSimpleDocument} from './transform';

export function graphql(): Plugin {
  return {
    name: '@quilted/graphql',
    async transform(code, id) {
      if (!id.endsWith('.graphql')) return null;

      const document = toSimpleDocument(
        cleanDocument(await loadDocument(code, id, this)),
      );

      return `export default JSON.parse(${JSON.stringify(
        JSON.stringify(document),
      )})`;

      async function loadDocument(
        code: string,
        file: string,
        plugin: TransformPluginContext,
      ) {
        const {imports, source} = extractImports(code);
        const document = parse(source);

        if (imports.length === 0) {
          return document;
        }

        const resolvedImports = await Promise.all(
          imports.map(async (imported) => {
            const resolvedId = await plugin.resolve(imported, file);

            if (resolvedId == null) {
              throw new Error(
                `Could not find ${JSON.stringify(
                  imported,
                )} from ${JSON.stringify(file)}`,
              );
            }

            plugin.addWatchFile(resolvedId.id);
            const contents = await readFile(resolvedId.id, {
              encoding: 'utf8',
            });

            return loadDocument(contents, resolvedId.id, plugin);
          }),
        );

        for (const {definitions} of resolvedImports) {
          (document.definitions as any[]).push(...definitions);
        }

        return document;
      }
    },
  };
}
