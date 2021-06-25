import {readFile} from 'fs/promises';
import {createRequire} from 'module';

import type {Plugin} from 'rollup';

export function systemJs({minify = false} = {}): Plugin {
  return {
    name: '@quilt/system-js',
    async renderChunk(_, chunk, options) {
      if (options.format !== 'system' || !chunk.isEntry) return null;

      const require = createRequire(import.meta.url);
      const systemjs = minify
        ? require.resolve('systemjs/dist/s.min.js')
        : require.resolve('systemjs/dist/s.js');

      // We write the systemjs loader to a dedicated file, and we make it the
      // "first import" of the chunk so that it is the first file listed in
      // the manifest.
      const fileHandle = this.emitFile({
        type: 'asset',
        name: 'loader.js',
        source: (await readFile(systemjs, {encoding: 'utf8'})).replace(
          // Remove the source map comment, if it is present, because we don’t upload the
          // sourcemap for this file.
          /\n?[/][/]# sourceMappingURL=s.*\.map\n?$/,
          '',
        ),
      });

      chunk.imports.unshift(this.getFileName(fileHandle));

      return null;
    },
  };
}
