import type {Plugin} from 'rollup';
import MagicString from 'magic-string';

import {polyfillAliasesForTarget} from './aliases';
import type {PolyfillFeature} from './types';

export type {PolyfillFeature};

export interface Options {
  target?: Parameters<typeof polyfillAliasesForTarget>[0];
  features?: PolyfillFeature[];
  sourceMap?: boolean;
}

export const POLYFILLS_MAGIC_MODULE = '__quilt__/polyfills.ts';

export function polyfill({
  target,
  features,
  sourceMap = true,
}: Options): Plugin {
  const polyfills = new Map(
    target ? Object.entries(polyfillAliasesForTarget(target)) : undefined,
  );

  return {
    name: '@quilted/polyfills',
    resolveId(source) {
      const polyfill = polyfills.get(source);

      return polyfill
        ? {id: polyfill, moduleSideEffects: 'no-treeshake'}
        : null;
    },
    transform(code, id) {
      if (features == null || features.length === 0) return null;

      const isEntry = this.getModuleInfo(id)?.isEntry ?? false;
      if (!isEntry) return null;

      // This thing helps with generating source maps...
      // @see https://github.com/rollup/plugins/blob/master/packages/inject/src/index.js#L203
      const magicString = new MagicString(code);

      magicString.prepend(
        `${features
          .map(
            (feature) =>
              `import ${JSON.stringify(`@quilted/polyfills/${feature}`)};`,
          )
          .join('\n')}\n`,
      );

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap({hires: true}) : null,
      };
    },
  };
}
