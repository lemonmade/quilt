import ServerCookies from 'cookie';
import type {CookieOptions} from '@quilted/http';

import type {Request, Response} from './types';

export const Cookies = {
  get({headers}: Pick<Request, 'headers'>, cookie: string): string | undefined {
    return ServerCookies.parse(headers.get('Cookie') ?? '')[cookie];
  },
  set(
    {headers}: Pick<Response, 'headers'>,
    cookie: string,
    value: string,
    options?: CookieOptions,
  ) {
    headers.append(
      'Set-Cookie',
      ServerCookies.serialize(cookie, value, options),
    );
  },
  delete(
    response: Pick<Response, 'headers'>,
    cookie: string,
    options?: CookieOptions,
  ) {
    Cookies.set(response, cookie, '', {expires: new Date(0), ...options});
  },
};

export interface HeadersWithRaw extends Headers {
  raw(): Record<string, string[]>;
}

// @see https://github.com/whatwg/fetch/issues/973
// @see https://github.com/sveltejs/kit/issues/3460
export function getResponseSetCookieHeaders({
  headers,
}: Pick<Response, 'headers'>): string[] | undefined {
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
}
