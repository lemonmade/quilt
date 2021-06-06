import * as Cookies from 'cookie';
import {RelativeTo} from '@quilted/routing';
import type {NavigateTo} from '@quilted/routing';

import {resolveTo, normalizeHeaders} from './utilities';
import type {
  Response,
  Request,
  ResponseCookies,
  ResponseOptions,
} from './types';

export function response(
  body?: BodyInit | null,
  {
    status = 200,
    cookies: existingCookies,
    headers: explicitHeaders,
  }: ResponseOptions = {},
): Response {
  const headers = normalizeHeaders(explicitHeaders);
  const response = new Response(body, {status, headers});

  const serializedCookies = new Map<string, string>(
    existingCookies?.entries() ?? [],
  );

  function updateSetCookieHeader() {
    response.headers.delete('Set-Cookie');

    for (const cookie of serializedCookies.values()) {
      response.headers.append('Set-Cookie', cookie);
    }
  }

  updateSetCookieHeader();

  const responseCookies: ResponseCookies = {
    set(cookie, value, options) {
      const setCookie = Cookies.serialize(cookie, value, options);
      serializedCookies.set(cookie, setCookie);

      updateSetCookieHeader();
    },
    delete(cookie, options) {
      responseCookies.set(cookie, '', {expires: new Date(0), ...options});
    },
    entries: () => serializedCookies.entries(),
    [Symbol.iterator]: () => serializedCookies.values(),
  };

  Reflect.defineProperty(response, 'cookies', {
    value: responseCookies,
    writable: false,
  });

  return response as any as Response;
}

export function notFound(
  options: Pick<ResponseOptions, 'headers' | 'cookies'> = {},
) {
  return response(null, {status: 404, ...options});
}

export function noContent(
  options: Pick<ResponseOptions, 'headers' | 'cookies'> = {},
) {
  return response(null, {status: 204, ...options});
}

export function redirect(
  to: NavigateTo,
  {
    status = 302,
    request,
    relativeTo,
    ...options
  }: Omit<ResponseOptions, 'status'> & {
    status?: 301 | 302 | 303 | 304;
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

export function html(body: any, options?: ResponseOptions) {
  const htmlResponse = response(body, options);
  htmlResponse.headers.set('Content-Type', 'text/html');
  return htmlResponse;
}

export function json(body: any, options?: ResponseOptions) {
  const jsonResponse = response(JSON.stringify(body), options);
  jsonResponse.headers.set('Content-Type', 'application/json');
  return jsonResponse;
}
