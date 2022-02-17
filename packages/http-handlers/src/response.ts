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

  return {status, headers, body: body ?? undefined};
}

export function notFound(options: Pick<ResponseOptions, 'headers'> = {}) {
  return response(null, {status: 404, ...options});
}

export function noContent(options: Pick<ResponseOptions, 'headers'> = {}) {
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
