import type {RenderableProps} from 'preact';
import {useRef, useLayoutEffect} from 'preact/hooks';

import type {AsyncFetchCache} from '@quilted/async';
import {signal, type Signal} from '@quilted/preact-signals';
import {useBrowserDetails} from '@quilted/preact-browser';

import {AsyncHydratedContext, AsyncFetchCacheContext} from './context.ts';

/**
 * Only needed for the following features:
 *
 * - `<AsyncComponent server={false}>` (needed to correctly hydrate client-only components)
 */
export function AsyncContext({
  cache,
  children,
}: RenderableProps<{
  cache?: AsyncFetchCache;
}>) {
  const browser = useBrowserDetails({optional: true});
  const internals = useRef<{
    hydrated: Signal<boolean>;
    deserialized: boolean;
  }>({deserialized: false} as any);
  if (internals.current.hydrated == null) {
    Object.assign(internals.current, {hydrated: signal(false)});
  }

  const {hydrated, deserialized} = internals.current;

  if (typeof document === 'object') {
    if (cache != null && browser != null && !deserialized) {
      const serialization = browser.serializations.get('quilt:fetch:hydrated');
      if (Array.isArray(serialization)) cache.restore(serialization);

      internals.current.deserialized = true;
    }

    useLayoutEffect(() => {
      hydrated.value = true;
    }, []);
  } else if (cache != null && browser != null) {
    browser.serializations.set('quilt:fetch:cache', () => cache.serialize());
  }

  const content = (
    <AsyncHydratedContext.Provider value={hydrated}>
      {children}
    </AsyncHydratedContext.Provider>
  );

  return cache ? (
    <AsyncFetchCacheContext.Provider value={cache}>
      {content}
    </AsyncFetchCacheContext.Provider>
  ) : (
    content
  );
}
