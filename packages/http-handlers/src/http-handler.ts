import ServerCookies from 'cookie';

import {createHeaders, HttpMethod} from '@quilted/http';

import {enhanceUrl} from '@quilted/routing';
import type {Match, Prefix} from '@quilted/routing';

import type {
  HttpHandler,
  Request,
  RequestOptions,
  RequestHandler,
} from './types';

export interface HttpHandlerOptions {
  readonly prefix?: Prefix;
  before?(request: Request): void | Promise<void>;
}

interface RequestHandlerRegistration {
  readonly method?: HttpMethod.Get | HttpMethod.Post | HttpMethod.Options;
  readonly handler: RequestHandler;
  readonly match: Match;
}

export function createHttpHandler({
  prefix,
  before,
}: HttpHandlerOptions = {}): HttpHandler {
  const registrations: RequestHandlerRegistration[] = [];

  return {
    any(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({match, handler});
    },
    get(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Get, match, handler});
    },
    post(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Post, match, handler});
    },
    options(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Options, match, handler});
    },
    async run(requestOptions) {
      const request = createRequest(requestOptions, prefix);
      const {normalizedPath} = request.url;

      await before?.(request);

      for (const {method, handler, match} of registrations) {
        if (method != null && method !== request.method) continue;
        if (typeof match === 'string') {
          if (match !== normalizedPath) continue;
        } else if (typeof match === 'function') {
          if (!match(request.url)) continue;
        } else if (!match.test(normalizedPath)) continue;

        return (await handler(request)) ?? undefined;
      }
    },
  };
}

function normalizeRouteArguments(...args: any[]): [Match, RequestHandler] {
  if (args[1]) {
    return args as [Match, RequestHandler];
  } else {
    return [/.*/, (args as [RequestHandler])[0]];
  }
}

function createRequest(
  {url, method = 'GET', body, headers = createHeaders()}: RequestOptions,
  prefix?: Prefix,
): Request {
  return {
    url: enhanceUrl(new URL(typeof url === 'string' ? url : url.href), prefix),
    body,
    method,
    headers,
    cookies: requestCookiesFromHeaders(headers),
  };
}

function requestCookiesFromHeaders(
  headers: Request['headers'],
): Request['cookies'] {
  const internalCookies = ServerCookies.parse(headers.get('Cookie') ?? '');

  return {
    get: (key) => internalCookies[key],
    has: (key) => internalCookies[key] != null,
    *entries() {
      yield* Object.entries(internalCookies);
    },
    *[Symbol.iterator]() {
      yield* Object.values(internalCookies);
    },
  };
}
