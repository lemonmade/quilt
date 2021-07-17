import BrowserCookies from 'js-cookie';
import {ContextType, useContext, useMemo} from 'react';
import type {PropsWithChildren} from 'react';

import {useSerialized} from '@quilted/react-html';
import type {Cookies} from '@quilted/http';

import {HttpAppContext, HttpServerContext} from '../context';

const SERIALIZED_ID = '_quilt.http';

/**
 * Provides HTTP details to your React application. This component will
 * read the headers and cookies provided during server-side rendering,
 * if they are available. If not, it will instead fall back to using
 * any headers serialized with the `useRequestHeader` hook, and use
 * the cookies found on `document.cookie`.
 */
export function HttpContext({
  children,
}: // eslint-disable-next-line @typescript-eslint/ban-types
PropsWithChildren<{}>) {
  const http = useContext(HttpServerContext);

  const serializedHeaders = useSerialized(SERIALIZED_ID, () => {
    if (http == null || http.persistedHeaders.size === 0) return undefined;

    const serializedHeaders: Record<string, string> = {};

    for (const header of http.persistedHeaders) {
      const value = http.headers.get(header);
      if (value) serializedHeaders[header] = value;
    }

    return serializedHeaders;
  });

  const context = useMemo<ContextType<typeof HttpAppContext>>(() => {
    return {
      cookies: http
        ? {
            ...http.cookies,
            set(...args) {
              return http.responseCookies.set(...args);
            },
            delete(...args) {
              return http.responseCookies.delete(...args);
            },
          }
        : cookiesFromDom(),
      headers: http?.headers ?? new Headers(serializedHeaders),
    };
  }, [http, serializedHeaders]);

  return (
    <HttpAppContext.Provider value={context}>
      {children}
    </HttpAppContext.Provider>
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
      *entries() {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      *[Symbol.iterator]() {},
    };
  }

  return {
    has(cookie) {
      return BrowserCookies.get(cookie) != null;
    },
    get(cookie) {
      return BrowserCookies.get(cookie);
    },
    set(cookie, value, options) {
      return BrowserCookies.set(cookie, value, options);
    },
    delete(cookie, options) {
      BrowserCookies.remove(cookie, options);
    },
    *entries() {
      yield* Object.entries(BrowserCookies.get());
    },
    *[Symbol.iterator]() {
      yield* Object.keys(BrowserCookies.get());
    },
  };
}
