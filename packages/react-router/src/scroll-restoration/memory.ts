import type {RouteChangeScrollRestorationCache} from '../types';

type ScrollCache = Map<string, Map<string, number>>;

export function createMemoryScrollRestoration(): RouteChangeScrollRestorationCache {
  const cache: ScrollCache = new Map();

  return {
    get(id, url) {
      return cache.get(url.key)?.get(id);
    },
    set(id, url, scroll) {
      let cacheForUrl = cache.get(url.key);

      if (cacheForUrl == null) {
        cacheForUrl = new Map();
        cache.set(url.key, cacheForUrl);
      }

      cacheForUrl.set(id, scroll);
    },
  };
}
