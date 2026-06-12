import type {Plugin} from 'vite';

/**
 * Bridges a Rollup-typed plugin into a Vite plugin array.
 *
 * `@quilted/rollup` plugins — and the magic-module plugins built from them —
 * are typed against the `rollup` package, while Vite 8's `Plugin` type comes
 * from rolldown. Vite runs Rollup plugins, so the two shapes are compatible at
 * runtime; this asserts that compatibility at the one boundary where the
 * nominal types diverge.
 */
export function asVitePlugin(plugin: object): Plugin {
  return plugin as Plugin;
}
