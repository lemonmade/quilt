import type {AsyncActionCache} from '@quilted/async';
import {useQuiltContext} from '@quilted/preact-context';

import type {AsyncComponentProps} from './AsyncComponent.tsx';

/**
 * The async context provided to all components in the tree by
 * `<QuiltFrameworkContext>`. Bundles cache, hydration state, and
 * component defaults into a single cohesive object.
 */
export interface AsyncContext {
  /**
   * A shared cache for async actions, used by `useAsync()` to deduplicate
   * and share in-flight fetch results. Required for server-side rendering,
   * where each request needs its own isolated cache.
   *
   * @see AsyncActionCache
   */
  readonly cache?: AsyncActionCache;

  /**
   * Default render options for all `<AsyncComponent>` elements in the tree,
   * such as a shared loading placeholder renderer.
   *
   * @see AsyncComponentProps
   */
  readonly components?: Pick<AsyncComponentProps<any>, 'render'>;

  /**
   * Whether the client-side hydration of the application has completed.
   * Backed by a signal so that reading this property inside a component
   * render subscribes to hydration state changes.
   *
   * Defaults to `true` when no async context is present (i.e., outside
   * of a `<QuiltFrameworkContext>`).
   */
  readonly isHydrated: boolean;
}

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * Async context for this application, provided by `<QuiltFrameworkContext>`.
     * Contains the async action cache, default async component options, and
     * hydration state.
     *
     * @see AsyncContext
     */
    readonly async?: AsyncContext;
  }
}

export function useAsyncActionCache(): AsyncActionCache;
export function useAsyncActionCache(options: {
  optional: boolean;
}): AsyncActionCache | undefined;
export function useAsyncActionCache(options?: {
  optional?: boolean;
}): AsyncActionCache | undefined {
  const cache = useQuiltContext('async', {optional: true})?.cache;

  if (!options?.optional && cache == null) {
    throw new Error(`Missing QuiltContext field: async.cache`);
  }

  return cache;
}
