import {readFile} from 'fs/promises';
import {createRequire} from 'module';

import type {Plugin} from 'rollup';
import MagicString from 'magic-string';

import {multiline} from '../shared/strings';

export function systemJS({minify = false} = {}) {
  return {
    name: '@quilted/system-js',

    async buildStart() {
      const require = createRequire(import.meta.url);
      const systemjs = minify
        ? require.resolve('systemjs/dist/s.min.js')
        : require.resolve('systemjs/dist/s.js');

      // We write the systemjs loader to a dedicated file
      this.emitFile({
        type: 'asset',
        name: 'system.js',
        source: (await readFile(systemjs, {encoding: 'utf8'}))
          .replace(
            // Remove the source map comment, if it is present, because we don’t upload the
            // sourcemap for this file.
            /\n?[/][/]# sourceMappingURL=s.*\.map\n?$/m,
            '',
          )
          .trim(),
      });
    },
    async renderChunk(code, chunk, options) {
      if (options.format !== 'system' || !chunk.isEntry) return null;

      const newCode = new MagicString(code);

      // We force the systemjs loader to immediately load the entrypoint. This allows the
      // scripts to be marked as `defer`; systemjs automatically runs an entrypoint when it
      // is the last script on the page, but only when scripts run in the `loading` document
      // ready state.
      //
      // @see https://github.com/systemjs/systemjs/pull/2216
      newCode.append(multiline`
        if (document.currentScript) {
          System.import(document.currentScript.src);
        } else {
          var scripts = document.getElementsByTagName('script');
          System.import(scripts[scripts.length - 1].src);
        }
      `);

      return {
        code: newCode.toString(),
        map: newCode.generateMap({hires: true}),
      };
    },
  } satisfies Plugin;
}
