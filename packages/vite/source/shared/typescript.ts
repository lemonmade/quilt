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
    // The wrapped plugin is typed against `rollup`; Vite 8 invokes these hooks
    // with a rolldown plugin context and option types. The two are compatible
    // at runtime, so forward the call across the nominal gap.
    buildStart(...args) {
      if (typeof plugin?.buildStart !== 'function') return;
      return (plugin.buildStart as Function).call(this, ...args);
    },
    resolveId(...args) {
      if (typeof plugin?.resolveId !== 'function') return;
      return (plugin.resolveId as Function).call(this, ...args);
    },
  };
}
