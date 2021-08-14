import type {Plugin, OutputChunk} from 'rollup';

import {PRELOAD_ALL_GLOBAL} from '../../constants';

export function preloadAllGlobal(): Plugin {
  return {
    name: '@quilted/preload-all-global',
    generateBundle(_, bundle) {
      const outputs = Object.values(bundle);
      const dynamicImports = outputs.filter(
        (chunk): chunk is OutputChunk =>
          chunk.type === 'chunk' && chunk.isDynamicEntry,
      );

      const preloadAllPromise = `Promise.all([${dynamicImports
        .map(
          (imported) =>
            // Not doing this trips up esbuild’s parser for the "from source"
            // build, lol
            `${'im'}${'port'}(${JSON.stringify(`./${imported.fileName}`)})`,
        )
        .join(', ')}])`;

      for (const output of outputs) {
        if (output.type !== 'chunk') continue;
        output.code = output.code.replace(
          new RegExp(PRELOAD_ALL_GLOBAL, 'g'),
          preloadAllPromise,
        );
      }
    },
  };
}
