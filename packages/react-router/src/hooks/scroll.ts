import {useLayoutEffect, useCallback, useMemo, useRef} from 'react';
import type {MutableRefObject} from 'react';

import type {EnhancedURL} from '../types';

import {useCurrentUrl} from './url';

interface Options {
  /**
   * Use an id when you want to restore multiple, independent scroll areas
   * across routes.
   */
  id?: string;
  /**
   * Whether you will manually restore the scroll based on some condition
   * using the `restore()` function returned by this hook. This should only
   * be used when you know that you will not be able to render enough content
   * to make page meaningfully the same as it was when the last scroll measurement
   * was taken (for example, because you need to load data before the scrollable
   * region can be restored).
   */
  manual?: boolean;
  /**
   * How the scroll position should be persisted. By default, scroll positions will
   * be persisted to sessionStorage. There is currently no manual clearing of this
   * cache, so if you are in a position where this can cause problems, you can instead
   * use `memory`, which only persists the scroll positions in-memory. Note that, as
   * a result, scroll position will not be restored for pages in history after a browser
   * reload (which does not match the "standard" browser behavior).
   */
  persist?: 'memory' | 'sessionStorage';
  /**
   * Controls whether a scroll should be restored for a given URL. You can use this
   * utility to opt some routes out of automatic scroll restoration, including potentially
   * using this hook in those excluded routes for custom scroll restoration behavior
   * on only that route. Note that this function is only called when the pathname of the
   * URL changes.
   */
  include?(url: EnhancedURL): boolean;
}

export interface ScrollRestorationResult {
  ref: MutableRefObject<HTMLElement | null>;
  restore(): () => void;
}

interface ScrollCache {
  [key: string]: {[key: string]: number};
}

const DEFAULT_ID = '__default';
const SESSION_STORAGE_KEY = '__quiltRouterScroll';

const memoryCache: ScrollCache = {};

const useEffect = typeof window === 'undefined' ? () => {} : useLayoutEffect;

export function useScrollRestoration({
  id = DEFAULT_ID,
  manual = false,
  include = defaultInclude,
  persist = 'sessionStorage',
}: Options = {}): ScrollRestorationResult {
  const currentUrl = useCurrentUrl();
  const scrollableRef = useRef<HTMLElement | null>(null);
  const persistRef = useRef<number>();
  const scrollRef = useRef<number>();

  const cache = useMemo<ScrollCache>(
    () =>
      persist === 'memory'
        ? memoryCache
        : (() => {
            try {
              return JSON.parse(
                sessionStorage.getItem(SESSION_STORAGE_KEY) ?? '{}',
              );
            } catch {
              return {};
            }
          })(),
    [persist],
  );

  const restore = useCallback(() => {
    const target = scrollableRef.current ?? document.documentElement;

    if (!include(currentUrl)) return noop;

    let scrollMap = cache[currentUrl.key];

    if (scrollMap) {
      const scrollTo = scrollMap[id];

      if (scrollTo == null) {
        scrollMap[id] = 0;
        scrollTargetTo(0);
      } else {
        scrollTargetTo(scrollTo);
      }
    } else {
      scrollMap = {[id]: 0};
      cache[currentUrl.key] = scrollMap;
      scrollTargetTo(0);
    }

    performPersist();

    return () => {
      scrollMap[id] = target.scrollTop;
      performPersist();

      if (scrollRef.current != null) {
        window.cancelAnimationFrame(scrollRef.current);
        scrollRef.current = undefined;
      }
    };

    function scrollTargetTo(to: number) {
      scrollRef.current = window.requestAnimationFrame(() => {
        target.scrollTop = to;
      });
    }

    function performPersist() {
      if (persist === 'sessionStorage') {
        if (persistRef.current != null) {
          (window as any).cancelIdleCallback(persistRef.current);
        }

        persistRef.current = (window as any).requestIdleCallback(() => {
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cache));
          } catch {
            // intentional noop
          }
        });
      }
    }

    // We don’t want to scroll randomly as a result of changing props, we want
    // to entirely restrict this effect to only when the app’s route has actually
    // changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl.normalizedPath]);

  useEffect(() => {
    if (manual) return;

    return restore();
    // Same basic premise as above — even if `manual` changes while on a route,
    // we want to leave them at their current scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore]);

  return {ref: scrollableRef, restore};
}

function defaultInclude() {
  return true;
}

function noop() {}
