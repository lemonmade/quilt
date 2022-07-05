import {CookieString} from '@quilted/http';

import {
  Response,
  type BodyInit,
  type ResponseInit,
  type RequestInit,
} from './globals';

import type {EnhancedWritableCookies} from './types';

export type {BodyInit, ResponseInit, RequestInit};

export type ResponseOrEnhancedResponse = Response &
  Partial<Pick<EnhancedResponse, 'cookies'>>;

export class EnhancedResponse extends Response {
  readonly cookies: EnhancedWritableCookies;

  constructor(body?: BodyInit | null, options?: ResponseInit) {
    super(body, options);

    if (typeof (options?.headers as HeadersWithRaw)?.raw === 'function') {
      for (const [header, values] of Object.entries(
        (options!.headers as HeadersWithRaw).raw(),
      )) {
        this.headers.delete(header);

        for (const value of values) {
          this.headers.append(header, value);
        }
      }
    }

    this.cookies = responseCookiesFromHeaders(this.headers);
  }
}

// Utilities

interface HeadersWithRaw extends Headers {
  raw(): Record<string, string[]>;
}

function responseCookiesFromHeaders(
  headers: Response['headers'],
): EnhancedWritableCookies {
  const cookies: EnhancedResponse['cookies'] = {
    set(cookie, value, options) {
      headers.append(
        'Set-Cookie',
        CookieString.serialize(cookie, value, options),
      );
    },
    delete(cookie, options) {
      cookies.set(cookie, '', {expires: new Date(0), ...options});
    },
    getAll() {
      if (typeof (headers as HeadersWithRaw).raw === 'function') {
        try {
          const rawHeaders = (headers as HeadersWithRaw).raw();

          if (typeof rawHeaders === 'object' && rawHeaders != null) {
            return rawHeaders['set-cookie'];
          }
        } catch {
          // intentional noop
        }
      }

      const setCookie = headers.get('Set-Cookie');
      return setCookie ? [setCookie] : undefined;
    },
  };

  return cookies;
}
