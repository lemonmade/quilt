import type {Plugin} from 'rollup';

export interface Options {
  extension: string;
}

const COMMONJS_PROXY_BAD_FILENAME_POSTFIX = /_commonjs-exports$/;

export function fixCommonJsPreserveModules({extension}: Options): Plugin {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  return {
    name: '@quilt/fix-commonjs-preserve-modules',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;

        const currentFilename = chunk.fileName;

        const newFileName = currentFilename.replace(
          COMMONJS_PROXY_BAD_FILENAME_POSTFIX,
          ext,
        );

        if (currentFilename !== newFileName) {
          chunk.fileName = newFileName;
          delete bundle[currentFilename];
          bundle[newFileName] = chunk;
        }

        chunk.code = chunk.code.replaceAll(/_commonjs-exports\b/g, ext);
        chunk.imports = chunk.imports.filter((imported) =>
          imported.replace(COMMONJS_PROXY_BAD_FILENAME_POSTFIX, ext),
        );

        for (const [imported, bindings] of Object.entries(
          chunk.importedBindings,
        )) {
          const normalizedImported = imported.replace(
            COMMONJS_PROXY_BAD_FILENAME_POSTFIX,
            ext,
          );

          if (normalizedImported !== imported) {
            delete chunk.importedBindings[imported];
            chunk.importedBindings[normalizedImported] = bindings;
          }
        }
      }
    },
  };
}
