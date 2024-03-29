import {CookieString} from '@quilted/http';
import type {ReadonlyCookies} from '@quilted/http';
import {Request, type RequestInit} from './globals.ts';

export class EnhancedRequest extends Request {
  readonly cookies: ReadonlyCookies;
  readonly URL: URL;

  constructor(info: RequestInfo | URL, options?: RequestInit) {
    super(info, options);
    this.URL = new URL(this.url);
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
