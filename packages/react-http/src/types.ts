import type {CookieOptions} from '@quilted/http';

export interface ReadonlyCookies {
  /**
   * Returns whether the provided cookie exists.
   */
  has(cookie: string): boolean;

  /**
   * Gets the current value of the provided cookie. If the cookie does
   * not exist, this method returns `undefined`.
   */
  get(cookie: string): string | undefined;

  /**
   * Iterates over all the cookies, with each iteration receiving a tuple
   * of `[cookieName, cookieValue]`, both of which are strings.
   */
  entries(): IterableIterator<readonly [string, string]>;

  /**
   * Iterates over all the cookie values that have been set.
   */
  [Symbol.iterator](): IterableIterator<string>;
}

/**
 * A wrapper around the cookies for a website, either on the server
 * or client.
 */
export interface Cookies extends ReadonlyCookies {
  /**
   * Sets a cookie to the provided value. You can pass options to
   * customize the behavior of the cookie as the third argument.
   */
  set(cookie: string, value: string, options?: CookieOptions): void;

  /**
   * Deletes the provided cookie. If you set your cookie on a custom
   * `path` or `domain`, you will  need to provide a matching `path` and
   * `domain` as the second argument to this method.
   */
  delete(
    cookie: string,
    options?: Pick<CookieOptions, 'path' | 'domain'>,
  ): void;
}
