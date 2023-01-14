import BrowserCookies from 'js-cookie';
import {ContextType, useContext, useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import type {Cookies} from '@quilted/http';

import {HttpCookiesContext, HttpServerContext} from '../context';

/**
 * Provides a consistent API for cookies, accessible through the
 * `useCookie()` and `useCookies()` hooks.
 */
export function CookieContext({children}: PropsWithChildren<{}>) {
  const http = useContext(HttpServerContext);

  const cookies = useMemo<ContextType<typeof HttpCookiesContext>>(
    () => http?.cookies ?? cookiesFromDom(),
    [http],
  );

  return (
    <HttpCookiesContext.Provider value={cookies}>
      {children}
    </HttpCookiesContext.Provider>
  );
}

function cookiesFromDom(): Cookies {
  if (typeof document === 'undefined') {
    return {
      has() {
        return false;
      },
      get() {
        return undefined;
      },
      set() {
        throw new Error(
          `Can’t set cookies because there is no document.cookie`,
        );
      },
      delete() {
        throw new Error(
          `Can’t delete cookies because there is no document.cookie`,
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      subscribe() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      *entries() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      *[Symbol.iterator]() {},
    };
  }

  const listeners = new Map<string, Set<(value?: string) => void>>();

  return {
    has(cookie) {
      return BrowserCookies.get(cookie) != null;
    },
    get(cookie) {
      return BrowserCookies.get(cookie);
    },
    set(cookie, value, options) {
      BrowserCookies.set(cookie, value, options);
      runListeners(cookie, BrowserCookies.get(cookie));
    },
    delete(cookie, options) {
      BrowserCookies.remove(cookie, options);
      runListeners(cookie, undefined);
    },
    subscribe(cookie, callback, {signal} = {}) {
      const callbacks = listeners.get(cookie) ?? new Set();
      callbacks.add(callback);
      listeners.set(cookie, callbacks);
      signal?.addEventListener('abort', () => callbacks.delete(callback), {
        once: true,
      });
    },
    *entries() {
      yield* Object.entries(BrowserCookies.get());
    },
    *[Symbol.iterator]() {
      yield* Object.keys(BrowserCookies.get());
    },
  };

  function runListeners(cookie: string, value?: string) {
    const callbacks = listeners.get(cookie);
    if (callbacks == null) return;

    for (const callback of callbacks) {
      callback(value);
    }
  }
}
