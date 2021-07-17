import * as ServerCookies from 'cookie';

/**
 * Additional options that can be passed when setting a cookie.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
 */
export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
}

/**
 * A wrapper around the cookies for a website, either on the server
 * or client.
 */
export interface Cookies {
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
 * A record of a cookie that will be set on a response.
 */
export interface CookieRecord extends CookieOptions {
  value: string;
}

/**
 * Like the regular `Cookies`, but with the ability to read the raw
 * descriptors of the cookies, rather than the serialized values.
 */
export interface ExtendedWritableCookies extends Cookies {
  /**
   * Iterates over all the cookies that will be set, in their raw form.
   */
  records(): IterableIterator<[string, CookieRecord]>;
}

export interface ReadonlyCookies extends Omit<Cookies, 'set' | 'delete'> {
  /**
   * Iterates over all the cookie values that have been set.
   */
  [Symbol.iterator](): IterableIterator<string>;
}

/**
 * Creates an in-memory representation of a set of cookies. This can
 * be used on the server to collect a series of writes to cookies,
 * before finalizing them in the `Set-Cookie` header of the response.
 */
export function createCookies(
  existingCookies?: IterableIterator<[string, CookieRecord]>,
): ExtendedWritableCookies {
  const internalCookies = new Map<string, CookieRecord>(existingCookies ?? []);

  const cookies: ExtendedWritableCookies = {
    has(cookie) {
      return internalCookies.has(cookie);
    },
    get(cookie) {
      return internalCookies.get(cookie)?.value;
    },
    set(cookie, value, options) {
      internalCookies.set(cookie, {value, ...options});
    },
    delete(cookie, options) {
      cookies.set(cookie, '', {expires: new Date(0), ...options});
    },
    *records() {
      yield* internalCookies.entries();
    },
    *entries() {
      for (const [cookie, {value, ...options}] of internalCookies) {
        yield [cookie, ServerCookies.serialize(cookie, value, options)];
      }
    },
    *[Symbol.iterator]() {
      for (const [cookie, {value, ...options}] of internalCookies) {
        yield ServerCookies.serialize(cookie, value, options);
      }
    },
  };

  return cookies;
}
