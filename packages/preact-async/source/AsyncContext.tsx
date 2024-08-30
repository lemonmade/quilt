import type {RenderableProps} from 'preact';
import {useRef, useLayoutEffect} from 'preact/hooks';

import type {AsyncActionCache} from '@quilted/async';
import {signal, type Signal} from '@quilted/preact-signals';

import type {AsyncComponentProps} from './AsyncComponent.tsx';
import {
  AsyncHydratedContext,
  AsyncActionCacheContext,
  AsyncComponentContext,
} from './context.ts';
import {useAsyncActionCacheSerialization} from './hooks/cache.ts';

/**
 * Only needed for the following features:
 *
 * - `useAsyncFetch()`, when you want to cache fetch results (always needed for SSR)
 * - `<AsyncComponent server={false}>` (needed to correctly hydrate client-only components)
 */
export function AsyncContext({
  cache,
  serialize,
  children,
  components,
}: RenderableProps<{
  cache?: AsyncActionCache;
  serialize?: boolean;
  components?: Pick<AsyncComponentProps<any>, 'render'>;
}>) {
  const hydrated = useRef<Signal<boolean>>();
  if (hydrated.current == null) hydrated.current = signal(false);

  if (serialize && cache) {
    useAsyncActionCacheSerialization(cache, {name: 'quilt:async'});
  }

  if (typeof document === 'object') {
    useLayoutEffect(() => {
      hydrated.current!.value = true;
    }, []);
  }

  let content = (
    <AsyncHydratedContext.Provider value={hydrated.current!}>
      {children}
    </AsyncHydratedContext.Provider>
  );

  if (components) {
    content = (
      <AsyncComponentContext.Provider value={components}>
        {content}
      </AsyncComponentContext.Provider>
    );
  }

  if (cache) {
    content = (
      <AsyncActionCacheContext.Provider value={cache}>
        {content}
      </AsyncActionCacheContext.Provider>
    );
  }

  return content;
}
