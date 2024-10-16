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

const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_TYPE_DEFAULT_VALUE = 'text/html; charset=utf-8';
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';
const CONTENT_TYPE_OPTIONS_DEFAULT_VALUE = 'nosniff';

export class HTMLResponse extends EnhancedResponse {
  constructor(body: BodyInit, options?: ResponseInit) {
    super(body, options);

    const {headers} = this;

    if (!headers.has(CONTENT_TYPE_HEADER)) {
      headers.set(CONTENT_TYPE_HEADER, CONTENT_TYPE_DEFAULT_VALUE);
    }

    if (!headers.has(CONTENT_TYPE_OPTIONS_HEADER)) {
      headers.set(
        CONTENT_TYPE_OPTIONS_HEADER,
        CONTENT_TYPE_OPTIONS_DEFAULT_VALUE,
      );
    }
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
