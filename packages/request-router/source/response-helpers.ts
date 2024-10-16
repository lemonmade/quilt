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
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';

const CONTENT_TYPE_DEFAULT_VALUE_HTML = 'text/html; charset=utf-8';
const CONTENT_TYPE_OPTIONS_DEFAULT_VALUE_HTML = 'nosniff';

export class HTMLResponse extends EnhancedResponse {
  constructor(body: BodyInit, options?: ResponseInit) {
    const headers = updateHeaders(options?.headers, {
      [CONTENT_TYPE_HEADER]: CONTENT_TYPE_DEFAULT_VALUE_HTML,
      [CONTENT_TYPE_OPTIONS_HEADER]: CONTENT_TYPE_OPTIONS_DEFAULT_VALUE_HTML,
    });

    super(body, {...options, headers});
  }
}

export {HTMLResponse as HtmlResponse};

export class JsonResponse extends EnhancedResponse {
  constructor(body: unknown, options?: ResponseInit) {
    const headers = updateHeaders(options?.headers, {
      [CONTENT_TYPE_HEADER]: 'application/json; charset=utf-8',
    });

    super(JSON.stringify(body), {
      ...options,
      headers,
    });
  }
}

export {JsonResponse as JSONResponse};

function updateHeaders(
  headersInit: HeadersInit | undefined,
  updateHeaders: Record<string, string>,
) {
  const headers = new Headers(headersInit);

  for (const [key, value] of Object.entries(updateHeaders)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  return headers;
}
