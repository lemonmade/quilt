import type {Plugin} from 'vite';

export function tsconfigAliases(): Plugin {
  let plugin:
    | Awaited<
        ReturnType<
          typeof import('@quilted/rollup/features/typescript').tsconfigAliases
        >
      >
    | undefined;

  return {
    name: '@quilted/tsconfig-aliases',
    enforce: 'pre',
    async configResolved({root}) {
      const {tsconfigAliases} = await import(
        '@quilted/rollup/features/typescript'
      );

      plugin = await tsconfigAliases({root});
    },
    buildStart(...args) {
      if (typeof plugin?.buildStart !== 'function') return;
      return plugin.buildStart.call(this, ...args);
    },
    resolveId(...args) {
      if (typeof plugin?.resolveId !== 'function') return;
      return plugin.resolveId.call(this, ...args);
    },
  };
}
