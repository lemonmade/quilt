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

export interface WritableCookies {
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

export interface SubscribableCookies {
  subscribe(
    cookie: string,
    callback: (value?: string) => void,
    options?: {signal?: AbortSignal},
  ): void;
}

/**
 * A wrapper around the cookies for a website, either on the server
 * or client.
 */
export interface Cookies
  extends ReadonlyCookies,
    WritableCookies,
    SubscribableCookies {}

// What follows is a basic re-implementation of https://www.npmjs.com/package/cookie.
// That library only uses CommonJS, which makes for some awkward build issues.

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

const FIELD_CONTENT_REG_EXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

export const CookieString = {
  parse(str: string) {
    const cookies: Record<string, string> = {};
    const pairs = str.split(';');

    for (const pair of pairs) {
      const index = pair.indexOf('=');

      // skip things that don't look like key=value
      if (index < 0) continue;

      const key = pair.substring(0, index).trim();

      // only assign once
      if (cookies[key] == null) {
        let value = pair.substring(index + 1, pair.length).trim();

        // quoted values
        if (value[0] === '"') {
          value = value.slice(1, -1);
        }

        cookies[key] = tryDecode(value);
      }
    }

    return cookies;
  },
  serialize(name: string, rawValue: string, options: CookieOptions = {}) {
    if (!FIELD_CONTENT_REG_EXP.test(name)) {
      throw new TypeError('argument name is invalid');
    }

    const value = encodeURIComponent(rawValue);

    if (value && !FIELD_CONTENT_REG_EXP.test(value)) {
      throw new TypeError('argument val is invalid');
    }

    let cookie = name + '=' + value;

    if (options.maxAge != null) {
      const maxAge = options.maxAge;

      if (isNaN(maxAge) || !isFinite(maxAge)) {
        throw new TypeError('option maxAge is invalid');
      }

      cookie += '; Max-Age=' + Math.floor(maxAge);
    }

    if (options.domain) {
      if (!FIELD_CONTENT_REG_EXP.test(options.domain)) {
        throw new TypeError('option domain is invalid');
      }

      cookie += '; Domain=' + options.domain;
    }

    if (options.path) {
      if (!FIELD_CONTENT_REG_EXP.test(options.path)) {
        throw new TypeError('option path is invalid');
      }

      cookie += '; Path=' + options.path;
    }

    if (options.expires) {
      cookie += '; Expires=' + options.expires.toUTCString();
    }

    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }

    if (options.secure) {
      cookie += '; Secure';
    }

    if (options.sameSite) {
      const sameSite =
        typeof options.sameSite === 'string'
          ? options.sameSite.toLowerCase()
          : options.sameSite;

      switch (sameSite) {
        case 'lax':
          cookie += '; SameSite=Lax';
          break;
        case 'strict':
          cookie += '; SameSite=Strict';
          break;
        case 'none':
          cookie += '; SameSite=None';
          break;
        default:
          throw new TypeError('option sameSite is invalid');
      }
    }

    return cookie;
  },
};

function tryDecode(str: string) {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}
