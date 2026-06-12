import type {Plugin} from 'vite';

/**
 * The single place this package bridges a Rollup-typed plugin to a Vite plugin.
 *
 * `@quilted/rollup` plugins — and the magic-module plugins built from them — are
 * typed against the `rollup` package, whereas Vite 8's `Plugin` sources its hook
 * context from rolldown. The two are not structurally assignable: rollup's
 * `PluginContext` is missing members rolldown's has (`cache`, `getWatchFiles`,
 * `setAssetSource`). Vite runs Rollup plugins unchanged at runtime, so rather
 * than scatter casts, every Rollup→Vite handoff goes through this one assertion.
 */
export function asVitePlugin(plugin: object): Plugin {
  return plugin as Plugin;
}
