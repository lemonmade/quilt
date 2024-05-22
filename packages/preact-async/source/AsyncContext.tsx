import type {RenderableProps} from 'preact';
import {useRef, useLayoutEffect} from 'preact/hooks';

import type {AsyncActionCache} from '@quilted/async';
import {signal, type Signal} from '@quilted/preact-signals';

import {AsyncHydratedContext, AsyncActionCacheContext} from './context.ts';
import {useAsyncActionCacheSerialization} from './hooks/cache.ts';

/**
 * Only needed for the following features:
 *
 * - `useAsyncFetch()`, when you want to cache fetch results (always needed for SSR)
 * - `<AsyncComponent server={false}>` (needed to correctly hydrate client-only components)
 */
export function AsyncContext({
  cache,
  children,
}: RenderableProps<{
  cache?: AsyncActionCache;
}>) {
  const hydrated = useRef<Signal<boolean>>();
  if (hydrated.current == null) hydrated.current = signal(false);

  useAsyncActionCacheSerialization(cache);

  if (typeof document === 'object') {
    useLayoutEffect(() => {
      hydrated.current!.value = true;
    }, []);
  }

  const content = (
    <AsyncHydratedContext.Provider value={hydrated.current!}>
      {children}
    </AsyncHydratedContext.Provider>
  );

  return cache ? (
    <AsyncActionCacheContext.Provider value={cache}>
      {content}
    </AsyncActionCacheContext.Provider>
  ) : (
    content
  );
}
