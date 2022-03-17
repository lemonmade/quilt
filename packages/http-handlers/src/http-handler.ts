import {createHeaders, HttpMethod, CookieString} from '@quilted/http';
import {getMatchDetails} from '@quilted/routing';

import type {Match, Prefix} from '@quilted/routing';

import type {
  HttpHandler,
  Request,
  RequestOptions,
  RequestHandler,
  RequestRegistration,
} from './types';

export interface HttpHandlerOptions {
  readonly prefix?: Prefix;
}

interface RequestHandlerRegistration {
  readonly method:
    | HttpMethod.Get
    | HttpMethod.Post
    | HttpMethod.Options
    | typeof REQUEST_METHOD_ANY;
  readonly handler: RequestRegistration;
  readonly match?: Match;
}

const REQUEST_METHOD_ANY = 'ANY';
const HTTP_HANDLER_RUN_INTERNAL = Symbol.for('Quilt.HttpHandler.RunInternal');

export function createHttpHandler({
  prefix,
}: HttpHandlerOptions = {}): HttpHandler {
  const registrations: RequestHandlerRegistration[] = [];

  const httpHandler: HttpHandler = {
    any(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: REQUEST_METHOD_ANY, match, handler});
      return httpHandler;
    },
    get(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Get, match, handler});
      return httpHandler;
    },
    post(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Post, match, handler});
      return httpHandler;
    },
    options(...args: any[]) {
      const [match, handler] = normalizeRouteArguments(...args);
      registrations.push({method: HttpMethod.Options, match, handler});
      return httpHandler;
    },
    async run(requestOptions) {
      return runInternal(createRequest(requestOptions));
    },
  };

  Reflect.defineProperty(httpHandler, HTTP_HANDLER_RUN_INTERNAL, {
    enumerable: false,
    value: runInternal,
  });

  return httpHandler;

  async function runInternal(request: Request, previouslyConsumed?: string) {
    const matchedPrefix =
      prefix == null
        ? undefined
        : getMatchDetails(
            request.url,
            prefix,
            undefined,
            previouslyConsumed,
            false,
          )?.consumed;

    // Not contained in the prefix
    if (prefix != null && matchedPrefix == null) return undefined;

    for (const {method, handler, match} of registrations) {
      const isBasicHandler = typeof handler === 'function';

      if (method !== REQUEST_METHOD_ANY && method !== request.method) {
        continue;
      }

      const matchDetails = getMatchDetails(
        request.url,
        match,
        undefined,
        matchedPrefix ?? previouslyConsumed,
        isBasicHandler,
      );

      if (matchDetails == null) {
        continue;
      }

      const result =
        typeof handler === 'function'
          ? await handler(request)
          : await Reflect.get(handler, HTTP_HANDLER_RUN_INTERNAL)(
              request,
              matchDetails.consumed,
            );

      if (result) return result;
    }
  }
}

function normalizeRouteArguments(
  ...args: any[]
): [Match | undefined, RequestHandler] {
  if (args[1]) {
    return args as [Match, RequestHandler];
  } else {
    return [undefined, (args as [RequestHandler])[0]];
  }
}

function createRequest({
  url,
  method = 'GET',
  body,
  headers = createHeaders(),
}: RequestOptions): Request {
  return {
    url: new URL(typeof url === 'string' ? url : url.href),
    body,
    method,
    headers,
    cookies: requestCookiesFromHeaders(headers),
  };
}

function requestCookiesFromHeaders(
  headers: Request['headers'],
): Request['cookies'] {
  const internalCookies = CookieString.parse(headers.get('Cookie') ?? '');

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
