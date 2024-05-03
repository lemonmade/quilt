import type {ReadonlySignal} from '@quilted/signals';

export type BrowserMetaAttributes = Partial<HTMLMetaElement>;
export type BrowserLinkAttributes = Partial<HTMLLinkElement>;
export type BrowserHTMLAttributes = Partial<HTMLHtmlElement & {class: string}>;
export type BrowserBodyAttributes = Partial<HTMLBodyElement & {class: string}>;

export interface BrowserDetails {
  readonly title: {
    add(title: string | ReadonlySignal<string>): () => void;
  };
  readonly metas: {
    add(
      attributes: BrowserMetaAttributes | ReadonlySignal<BrowserMetaAttributes>,
    ): () => void;
  };
  readonly links: {
    add(
      attributes: BrowserLinkAttributes | ReadonlySignal<BrowserLinkAttributes>,
    ): () => void;
  };
  readonly serializations: {
    get<T = unknown>(id: string): T;
    set(id: string, data: unknown): void;
    [Symbol.iterator](): IterableIterator<[string, unknown]>;
  };
  readonly htmlAttributes: {
    add(
      attributes: BrowserHTMLAttributes | ReadonlySignal<BrowserHTMLAttributes>,
    ): () => void;
  };
  readonly bodyAttributes: {
    add(
      attributes: BrowserBodyAttributes | ReadonlySignal<BrowserBodyAttributes>,
    ): () => void;
  };
  readonly cookies: Cookies;
  readonly request: Request;
}

/**
 * A wrapper around the cookies for a website, either on the server
 * or client.
 */
export interface Cookies extends CookiesReadonly, CookiesWritable {}

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

export interface CookiesReadonly {
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

export interface CookiesWritable {
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
