import {CookieString} from '@quilted/http';
import type {ReadonlyCookies} from '@quilted/http';
import {Request, type RequestInit} from './globals';

export class EnhancedRequest extends Request {
  readonly cookies: ReadonlyCookies;

  constructor(info: RequestInfo | URL, options?: RequestInit) {
    super(info, options);
    this.cookies = requestCookiesFromHeaders(this.headers);
  }
}

function requestCookiesFromHeaders(
  headers: Request['headers'],
): ReadonlyCookies {
  const internalCookies = CookieString.parse(headers.get('Cookie') ?? '');

  return {
    get: (key) => internalCookies[key],
    has: (key) => internalCookies[key] != null,
    *entries() {
      yield* Object.entries(internalCookies);
    },
    *[Symbol.iterator]() {
      yield* Object.values(internalCookies);
    },
  };
}
