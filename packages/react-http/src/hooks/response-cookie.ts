import type {CookieOptions} from '@quilted/http';
import {useHttpAction} from './http-action';

/**
 * Sets an HTTP cookie on the response. You can optionally provide
 * cookie options to customize the behavior of this cookie.
 *
 * This hook only works during server-side rendering. If you want
 * to set cookies in JavaScript, use the `useCookies` function to
 * get access to the cookie manager, and use the `set()` method to
 * update the cookie.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
 */
export function useResponseCookie(
  cookie: string,
  value: string,
  options?: CookieOptions,
) {
  useHttpAction((http) => http.cookies.set(cookie, value, options));
}

/**
 * Deletes an HTTP cookie on the response. If you originally set the
 * cookie with a custom `path` or `domain`, you must provide matching
 * options to this function.
 */
export function useDeleteResponseCookie(
  cookie: string,
  options?: Pick<CookieOptions, 'path' | 'domain'>,
) {
  useHttpAction((http) => http.cookies.delete(cookie, options));
}
