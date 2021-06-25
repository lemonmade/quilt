import {readFile} from 'fs/promises';
import {createRequire} from 'module';

import type {Plugin} from 'rollup';

export function systemJs(): Plugin {
  return {
    name: '@quilt/system-js',
    async renderChunk(_, chunk, options) {
      if (options.format !== 'system' || !chunk.isEntry) return null;

      const require = createRequire(import.meta.url);
      const systemjs = require.resolve('systemjs/dist/s.min.js');

      // We write the systemjs loader to a dedicated file, and we make it the
      // "first import" of the chunk so that it is the first file listed in
      // the manifest.
      const fileHandle = this.emitFile({
        type: 'asset',
        name: 'loader.js',
        source: await readFile(systemjs, {encoding: 'utf8'}),
      });

      chunk.imports.unshift(this.getFileName(fileHandle));

      return null;
    },
  };
}
