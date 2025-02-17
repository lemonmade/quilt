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
