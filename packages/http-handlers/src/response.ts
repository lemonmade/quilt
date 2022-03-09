import ServerCookies from 'cookie';

import {RelativeTo} from '@quilted/routing';
import type {NavigateTo} from '@quilted/routing';
import {createHeaders} from '@quilted/http';

import {resolveTo} from './utilities';
import type {Response, Request, ResponseOptions} from './types';

export function response(
  body?: string | null,
  {status = 200, headers: explicitHeaders}: ResponseOptions = {},
): Response {
  const headers = createHeaders(explicitHeaders);

  return {
    status,
    headers,
    cookies: responseCookiesFromHeaders(headers),
    body: body ?? undefined,
  };
}

export function notFound(options: Pick<ResponseOptions, 'headers'> = {}) {
  return response(null, {status: 404, ...options});
}

export function noContent(options: Pick<ResponseOptions, 'headers'> = {}) {
  return response(null, {status: 204, ...options});
}

// @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
export function redirect(
  to: NavigateTo,
  {
    status = 308,
    request,
    relativeTo,
    ...options
  }: Omit<ResponseOptions, 'status'> & {
    status?: 300 | 301 | 302 | 303 | 304 | 305 | 305 | 307 | 308;
    request?: Request;
    relativeTo?: RelativeTo;
  } = {},
): Response {
  const redirectResponse = response(null, {status, ...options});

  redirectResponse.headers.set(
    'Location',
    resolveTo(to, {request, relativeTo}),
  );

  return redirectResponse;
}

export function html(body: string, options?: ResponseOptions) {
  const htmlResponse = response(body, options);
  htmlResponse.headers.set('Content-Type', 'text/html');
  return htmlResponse;
}

export function json(body: any, options?: ResponseOptions) {
  const jsonResponse = response(JSON.stringify(body), options);
  jsonResponse.headers.set('Content-Type', 'application/json');
  return jsonResponse;
}

// Utilities

interface HeadersWithRaw extends Headers {
  raw(): Record<string, string[]>;
}

function responseCookiesFromHeaders(
  headers: Response['headers'],
): Response['cookies'] {
  const cookies: Response['cookies'] = {
    set(cookie, value, options) {
      headers.append(
        'Set-Cookie',
        ServerCookies.serialize(cookie, value, options),
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
