import type {RouteChangeScrollRestorationCache} from '../types';

type ScrollCache = Record<string, Record<string, number>>;

export interface Options {
  key?: string;
}

const DEFAULT_STORAGE_KEY = 'route-scroll-restoration';

export function createSessionStorageScrollRestoration({
  key = DEFAULT_STORAGE_KEY,
}: Options = {}): RouteChangeScrollRestorationCache {
  const cache = loadCacheFromSessionStorage(key);
  let persistHandle: number;

  return {
    get(id, url) {
      return cache[url.key]?.[id];
    },
    set(id, url, scroll) {
      let cacheForUrl = cache[url.key];

      if (cacheForUrl == null) {
        cacheForUrl = {};
        cache[url.key] = cacheForUrl;
      }

      if (cacheForUrl[id] === scroll) return;

      cacheForUrl[id] = scroll;

      if (persistHandle != null) {
        (window as any).cancelIdleCallback(persistHandle);
      }

      persistHandle = (window as any).requestIdleCallback(() => {
        try {
          sessionStorage.setItem(key, JSON.stringify(cache));
        } catch {
          // intentional noop
        }
      });
    },
  };
}

function loadCacheFromSessionStorage(key: string): ScrollCache {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? '{}');
  } catch {
    return {};
  }
}
