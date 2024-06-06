import {useRef} from 'preact/hooks';

import type {AsyncActionCache} from '@quilted/async';
import {useBrowserDetails} from '@quilted/preact-browser';

export function useAsyncActionCacheSerialization(
  cache?: Pick<AsyncActionCache, 'restore' | 'serialize'>,
  {
    name = 'fetch:cache',
    optional = true,
  }: {name?: string; optional?: boolean} = {},
) {
  const browser = useBrowserDetails({optional});
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
