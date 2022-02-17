import ServerCookies from 'cookie';
import type {CookieOptions} from '@quilted/http';

import type {Request, Response} from './types';

export function getRequestCookie(
  request: Request,
  cookie: string,
): string | undefined {
  return ServerCookies.parse(request.headers.get('Cookie') ?? '')[cookie];
}

export function setResponseCookie(
  response: Response,
  cookie: string,
  value: string,
  options?: CookieOptions,
) {
  response.headers.append(
    'Set-Cookie',
    ServerCookies.serialize(cookie, value, options),
  );
}

export function deleteResponseCookie(
  response: Response,
  cookie: string,
  options?: CookieOptions,
) {
  setResponseCookie(response, cookie, '', {expires: new Date(0), ...options});
}

interface HeadersWithRaw extends Headers {
  raw(): Record<string, string[]>;
}

// @see https://github.com/whatwg/fetch/issues/973
// @see https://github.com/sveltejs/kit/issues/3460
export function getResponseSetCookieHeaders({
  headers,
}: Response): string[] | undefined {
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
