import {useContext} from 'react';
import {HttpCookiesContext} from '../context';

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
export function useCookies() {
  const cookies = useContext(HttpCookiesContext);

  if (cookies == null) {
    throw new Error('No cookie context found');
  }

  return cookies;
}

/**
 * Provides the current value of the requested cookie. When run on the
 * client, this value will read from `document.cookie`. If you configure
 * server-side rendering of HTTP details for your application, or use
 * Quilt’s automatic server rendering feature, this hook will read cookies
 * from the HTTP request during server-side rendering.
 */
export function useCookie(cookie: string) {
  return useCookies().get(cookie);
}
