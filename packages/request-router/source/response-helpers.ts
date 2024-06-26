import {resolveURL, type NavigateTo} from '@quilted/routing';

import {EnhancedResponse, type ResponseInit} from './response.ts';

export class NotFoundResponse extends EnhancedResponse {
  constructor(
    body?: BodyInit | null,
    options: Omit<ResponseInit, 'status'> = {},
  ) {
    super(body, {status: 404, ...options});
  }
}

export class NoContentResponse extends EnhancedResponse {
  constructor(options: Omit<ResponseInit, 'status'> = {}) {
    super(null, {status: 204, ...options});
  }
}

export class RedirectResponse extends EnhancedResponse {
  constructor(
    to: NavigateTo,
    {
      status = 308,
      request,
      ...options
    }: Omit<ResponseInit, 'status'> & {
      status?: 300 | 301 | 302 | 303 | 304 | 305 | 305 | 307 | 308;
      request?: Request;
    } = {},
  ) {
    super(null, {status, ...options});
    this.headers.set('Location', resolveURL(to, request?.url).href);
  }
}

export class HTMLResponse extends EnhancedResponse {
  constructor(body: BodyInit, options?: ResponseInit) {
    super(body, options);
    this.headers.set('Content-Type', 'text/html; charset=utf-8');
  }
}

export {HTMLResponse as HtmlResponse};

export class JsonResponse extends EnhancedResponse {
  constructor(body: unknown, options?: ResponseInit) {
    super(JSON.stringify(body), options);
    this.headers.set('Content-Type', 'application/json; charset=utf-8');
  }
}

export {JsonResponse as JSONResponse};
