import {useRef} from 'preact/hooks';

import type {AsyncFetchCache} from '@quilted/async';
import {useBrowserDetails} from '@quilted/preact-browser';

export function useAsyncFetchCacheSerialization(
  cache?: AsyncFetchCache,
  {name = 'fetch:cache'}: {name?: string} = {},
) {
  const browser = useBrowserDetails({optional: cache != null});
  const restored = useRef(false);

  if (typeof document === 'object') {
    if (cache != null && browser != null && !restored.current) {
      const serialization = browser.serializations.get(name);
      if (Array.isArray(serialization)) cache.restore(serialization);

      restored.current = true;
    }
  } else if (cache != null && browser != null) {
    browser.serializations.set(name, () => cache.serialize());
  }
}
