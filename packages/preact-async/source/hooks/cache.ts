import {useRef} from 'preact/hooks';

import type {AsyncFetchCache} from '@quilted/async';
import {useBrowserDetails} from '@quilted/preact-browser';

export function useAsyncFetchCacheSerialization(
  cache?: AsyncFetchCache,
  {name = 'fetch:cache'}: {name?: string} = {},
) {
  const browser = useBrowserDetails({optional: cache == null});
  const restored = useRef<typeof browser>();

  if (cache == null || browser == null) return;

  if (typeof document === 'object') {
    if (restored.current !== browser) {
      const serialization = browser.serializations.get(name);
      if (Array.isArray(serialization)) cache.restore(serialization);

      restored.current = browser;
    }
  } else {
    browser.serializations.set(name, () => cache.serialize());
  }
}
