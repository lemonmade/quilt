import type {Plugin} from 'vite';

export function monorepoPackageAliases(): Plugin {
  let plugin:
    | Awaited<
        ReturnType<
          typeof import('@quilted/rollup/features/node').monorepoPackageAliases
        >
      >
    | undefined;

  return {
    name: '@quilted/monorepo-package-aliases',
    enforce: 'pre',
    async configResolved({root}) {
      const {monorepoPackageAliases} = await import(
        '@quilted/rollup/features/node'
      );

      plugin = await monorepoPackageAliases({root});
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
