import {createHeaders, HttpMethod, CookieString} from '@quilted/http';
import {getMatchDetails} from '@quilted/routing';

import type {Match, Prefix} from '@quilted/routing';

import type {
  HttpHandler,
  Request,
  RequestContext,
  RequestOptions,
  RequestRegistration,
  RequestRegistrationOptions,
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
  readonly exact: boolean;
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
      registrations.push(normalizeRouteArguments(REQUEST_METHOD_ANY, ...args));
      return httpHandler;
    },
    get(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Get, ...args));
      return httpHandler;
    },
    post(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Post, ...args));
      return httpHandler;
    },
    options(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Options, ...args));
      return httpHandler;
    },
    async run(requestOptions, requestContext = {}) {
      return runInternal(createRequest(requestOptions), requestContext);
    },
  };

  Reflect.defineProperty(httpHandler, HTTP_HANDLER_RUN_INTERNAL, {
    enumerable: false,
    value: runInternal,
  });

  return httpHandler;

  async function runInternal(
    request: Request,
    context: RequestContext,
    previouslyConsumed?: string,
  ) {
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

    for (const {method, handler, match, exact} of registrations) {
      if (method !== REQUEST_METHOD_ANY && method !== request.method) {
        continue;
      }

      const matchDetails = getMatchDetails(
        request.url,
        match,
        undefined,
        matchedPrefix ?? previouslyConsumed,
        exact,
      );

      if (matchDetails == null) {
        continue;
      }

      const result =
        typeof handler === 'function'
          ? await handler(request, context)
          : await Reflect.get(handler, HTTP_HANDLER_RUN_INTERNAL)(
              request,
              context,
              matchDetails.consumed,
            );

      if (result) return result;
    }
  }
}

function normalizeRouteArguments(
  method: RequestHandlerRegistration['method'],
  ...args: any[]
): RequestHandlerRegistration {
  // There is no `match`...
  if (isHttpHandler(args[0]) || typeof args[0] === 'function') {
    return {
      method,
      handler: args[0],
      exact:
        isHttpHandler(args[0]) ||
        ((args[1] as RequestRegistrationOptions | undefined)?.exact ?? true),
    };
  }

  // There is a `match`, `HttpHandler`, and maybe `options` (no options
  // respected for now)...
  if (isHttpHandler(args[1])) {
    return {
      method,
      match: args[0],
      handler: args[1],
      exact: false,
    };
  }

  // There is a `match`, `RequestHandler`, and maybe `options`...
  return {
    method,
    match: args[0],
    handler: args[1],
    exact: (args[2] as RequestRegistrationOptions | undefined)?.exact ?? true,
  };
}

function isHttpHandler(value?: unknown): value is HttpHandler {
  return (
    value != null &&
    typeof value === 'object' &&
    Reflect.has(value, HTTP_HANDLER_RUN_INTERNAL)
  );
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
