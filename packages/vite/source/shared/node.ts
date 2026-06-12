import type {Plugin} from 'vite';

import {asVitePlugin} from './plugin.ts';

export function monorepoPackageAliases(): Plugin {
  // Loaded lazily in `configResolved` because the underlying @quilted/rollup
  // plugin needs the resolved `root`. It's typed against `rollup`; presenting
  // it as a Vite plugin (Vite runs Rollup plugins) lets its hooks be delegated
  // with matching context types instead of a cast at every call site.
  let plugin: Plugin | undefined;

  return {
    name: '@quilted/monorepo-package-aliases',
    enforce: 'pre',
    async configResolved({root}) {
      const {monorepoPackageAliases} = await import(
        '@quilted/rollup/features/node'
      );

      const loaded = await monorepoPackageAliases({root});
      plugin = loaded && asVitePlugin(loaded);
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
