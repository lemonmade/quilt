import type {RelativeTo} from '@quilted/routing';

import {EnhancedResponse, type ResponseInit} from './response';
import {resolveTo, type NavigateTo} from './utilities';

export function notFound(options: Omit<ResponseInit, 'status'> = {}) {
  return new EnhancedResponse(null, {status: 404, ...options});
}

export function noContent(options: Omit<ResponseInit, 'status'> = {}) {
  return new EnhancedResponse(null, {status: 204, ...options});
}

// @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
export function redirect(
  to: NavigateTo,
  {
    status = 308,
    request,
    relativeTo,
    ...options
  }: Omit<ResponseInit, 'status'> & {
    status?: 300 | 301 | 302 | 303 | 304 | 305 | 305 | 307 | 308;
    request?: Request;
    relativeTo?: RelativeTo;
  } = {},
) {
  const response = new EnhancedResponse(null, {status, ...options});
  response.headers.set('Location', resolveTo(to, {request, relativeTo}));
  return response;
}

export function html(body: BodyInit, options?: ResponseInit) {
  const response = new EnhancedResponse(body, options);
  response.headers.set('Content-Type', 'text/html');
  return response;
}

export function json(body: any, options?: ResponseInit) {
  const response = new EnhancedResponse(JSON.stringify(body), options);
  response.headers.set('Content-Type', 'application/json');
  return response;
}
