import ServerCookies from 'cookie';
import SetCookieParser from 'set-cookie-parser';

import type {CookieOptions} from '@quilted/http-handlers';

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

export function parseResponseCookies(response: Response) {
  const cookies = SetCookieParser.parse(
    response.headers.get('Set-Cookie') ?? '',
  );

  return new Map(
    cookies.map(({name, value, ...options}) => {
      return [name, ServerCookies.serialize(name, value, options as any)];
    }),
  );
}
