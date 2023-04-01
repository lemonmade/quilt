import {useMemo, useSyncExternalStore} from 'react';
import {createUseContextHook} from '@quilted/react-utilities';

import {HttpCookiesContext} from '../context.ts';

/**
 * Provides access to the cookie manager for the application. This
 * object provides imperative access to reading and writing cookies,
 * and can be used to set cookies in response to user actions on the
 * client.
 *
 * If you want to set a cookie as part of a server-rendered HTML response,
 * you can use the `useResponseCookie` or `useDeleteResponseCookie` hooks,
 * or the `ResponseCookie` component.
 */
export const useCookies = createUseContextHook(HttpCookiesContext);

/**
 * Provides the current value of the requested cookie. When run on the
 * client, this value will read from `document.cookie`. If you configure
 * server-side rendering of HTTP details for your application, or use
 * Quilt’s automatic server rendering feature, this hook will read cookies
 * from the HTTP request during server-side rendering.
 */
export function useCookie(cookie: string) {
  const cookies = useCookies();

  const value = useSyncExternalStore(
    ...useMemo<Parameters<typeof useSyncExternalStore<string | undefined>>>(
      () => [
        (callback) => {
          const abort = new AbortController();
          cookies.subscribe(cookie, callback, {signal: abort.signal});
          return () => abort.abort();
        },
        () => cookies.get(cookie),
      ],
      [cookie, cookies],
    ),
  );

  return value;
}
