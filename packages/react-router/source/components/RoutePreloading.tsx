import {memo, useState, useRef, useCallback, useMemo, useEffect} from 'react';
import type {PropsWithChildren} from 'react';

import {useRouter} from '../hooks';
import {PreloaderContext} from '../context';
import {createPreloader} from '../preloader';
import type {PreloadMatch} from '../preloader';

import {EventListener} from './EventListener';

interface NavigatorWithConnection {
  connection: {saveData: boolean};
}

export const INTENTION_DELAY_MS = 150;

export const RoutePreloading = memo(function RoutePreloading({
  children,
}: PropsWithChildren<{}>) {
  const router = useRouter();
  const preloader = useMemo(() => createPreloader(router), [router]);

  const [url, setUrl] = useState<null | URL>(null);
  const [preloadMatches, setPreloadMatches] = useState<PreloadMatch[]>([]);
  const timeout = useRef<number | null>(null);
  const timeoutUrl = useRef<URL | null>(null);
  const {current: preloadAggressively} = useRef(shouldPreloadAggressively());

  useEffect(() => {
    if (url == null) return;
    return preloader.listenForMatch(url, setPreloadMatches);
  }, [preloader, url]);

  const clearTimeout = () => {
    if (timeout.current != null) {
      window.clearTimeout(timeout.current);
      timeout.current = null;
      timeoutUrl.current = null;
    }
  };

  const handleMouseOver = useCallback(
    ({target}: MouseEvent | FocusEvent) => {
      if (target == null) {
        return;
      }

      const url = closestUrlFromNode(target);

      if (url == null) {
        return;
      }

      if (timeout.current) {
        if (urlsEqual(url, timeoutUrl.current)) {
          return;
        } else {
          clearTimeout();
        }
      }

      timeoutUrl.current = url;
      timeout.current = window.setTimeout(() => {
        clearTimeout();
        setUrl(url);
        setPreloadMatches(preloader.getMatches(url));
      }, INTENTION_DELAY_MS);
    },
    [preloader],
  );

  const handleMouseLeave = useCallback(
    ({target, relatedTarget}: MouseEvent | FocusEvent) => {
      if (target == null) {
        clearTimeout();
        return;
      }

      if (url == null && timeout.current == null) {
        return;
      }

      const closestUrl = closestUrlFromNode(target);
      const relatedUrl = relatedTarget && closestUrlFromNode(relatedTarget);

      if (
        timeout.current != null &&
        urlsEqual(closestUrl, timeoutUrl.current) &&
        !urlsEqual(relatedUrl, timeoutUrl.current)
      ) {
        clearTimeout();
      }

      if (urlsEqual(closestUrl, url) && !urlsEqual(relatedUrl, url)) {
        setUrl(null);
        setPreloadMatches([]);
      }
    },
    [url],
  );

  const handleMouseDown = useCallback(
    ({target}: MouseEvent) => {
      clearTimeout();

      if (target == null) {
        return;
      }

      const url = closestUrlFromNode(target);

      if (url != null) {
        setUrl(url);
        setPreloadMatches(preloader.getMatches(url));
      }
    },
    [preloader],
  );

  const preloadMarkup = url ? (
    <div style={{visibility: 'hidden'}}>
      {preloadMatches.map(({id, matched, render}) => {
        return (
          <div key={id}>
            {typeof render === 'function' ? render({url, matched}) : render}
          </div>
        );
      })}
    </div>
  ) : null;

  const expensiveListeners = preloadAggressively ? (
    <>
      <EventListener passive event="mouseover" handler={handleMouseOver} />
      <EventListener passive event="focusin" handler={handleMouseOver} />
      <EventListener passive event="mouseout" handler={handleMouseLeave} />
      <EventListener passive event="focusout" handler={handleMouseLeave} />
    </>
  ) : null;

  return (
    <>
      <PreloaderContext.Provider value={preloader}>
        {children}
      </PreloaderContext.Provider>
      <EventListener passive event="mousedown" handler={handleMouseDown} />
      {expensiveListeners}
      {preloadMarkup}
    </>
  );
});

function shouldPreloadAggressively() {
  return (
    typeof navigator === 'undefined' ||
    !('connection' in navigator) ||
    !(navigator as any as NavigatorWithConnection).connection.saveData
  );
}

function urlsEqual(first?: URL | null, second?: URL | null) {
  return (
    (first == null && first === second) ||
    (first != null && second != null && first.href === second.href)
  );
}

function closestUrlFromNode(element: EventTarget) {
  if (!(element instanceof HTMLElement)) {
    return undefined;
  }

  // data-href is a hack for resource list doing the <a> as a sibling
  const closestUrl = element.closest('[href], [data-href]');

  if (closestUrl == null || !(closestUrl instanceof HTMLElement)) {
    return undefined;
  }

  const url =
    closestUrl.getAttribute('href') || closestUrl.getAttribute('data-href');

  try {
    return url ? new URL(url, window.location.href) : undefined;
  } catch (error) {
    return undefined;
  }
}
