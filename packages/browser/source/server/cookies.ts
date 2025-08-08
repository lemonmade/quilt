import {CookieString} from '../shared/cookies.ts';
import type {Cookies, CookieOptions} from '../types.ts';

export class ResponseCookies implements Cookies {
  readonly #cookieValues: Map<string, string>;
  readonly #setCookies: Map<string, string> = new Map();

  constructor({request}: {request?: Request} = {}) {
    this.#cookieValues = new Map(
      Object.entries(CookieString.parse(request?.headers.get('Cookie') ?? '')),
    );
  }

  get(cookie: string) {
    return this.#cookieValues.get(cookie);
  }

  has(cookie: string) {
    return this.#cookieValues.has(cookie);
  }

  *entries() {
    yield* this.#cookieValues.entries();
  }

  *[Symbol.iterator]() {
    yield* this.#cookieValues.values();
  }

  set(cookie: string, value: string, options?: CookieOptions) {
    this.#cookieValues.set(cookie, value);
    this.#setCookies.set(
      cookie,
      CookieString.serialize(cookie, value, options),
    );
  }

  delete(cookie: string, options?: CookieOptions) {
    this.#cookieValues.delete(cookie);
    this.#setCookies.set(cookie, CookieString.serialize(cookie, '', options));
  }

  toHeaders(headers: Headers = new Headers()) {
    for (const setCookies of this.#setCookies.values()) {
      headers.append('Set-Cookie', setCookies);
    }

    return headers;
  }
}
