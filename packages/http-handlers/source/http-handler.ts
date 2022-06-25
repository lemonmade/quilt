import {HttpMethod} from '@quilted/http';
import {getMatchDetails} from '@quilted/routing';

import type {Match, Prefix} from '@quilted/routing';

import {EnhancedRequest} from './request';
import type {
  HttpHandler,
  RequestContext,
  RequestRegistration,
  RequestRegistrationOptions,
} from './types';

export interface HttpHandlerOptions {
  readonly prefix?: Prefix;
}

interface RequestHandlerRegistration {
  readonly method: HttpMethod | typeof REQUEST_METHOD_ANY;
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
    head(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Head, ...args));
      return httpHandler;
    },
    get(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Get, ...args));
      return httpHandler;
    },
    connect(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Connect, ...args));
      return httpHandler;
    },
    options(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Options, ...args));
      return httpHandler;
    },
    post(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Post, ...args));
      return httpHandler;
    },
    put(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Put, ...args));
      return httpHandler;
    },
    patch(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Patch, ...args));
      return httpHandler;
    },
    delete(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Delete, ...args));
      return httpHandler;
    },
    async run(request, requestContext = {} as any) {
      return runInternal(new EnhancedRequest(request), requestContext);
    },
  };

  Reflect.defineProperty(httpHandler, HTTP_HANDLER_RUN_INTERNAL, {
    enumerable: false,
    value: runInternal,
  });

  return httpHandler;

  async function runInternal(
    request: EnhancedRequest,
    context: RequestContext,
    previouslyConsumed?: string,
  ) {
    const url = new URL(request.url);
    const matchedPrefix =
      prefix == null
        ? undefined
        : getMatchDetails(url, prefix, undefined, previouslyConsumed, false)
            ?.consumed;

    // Not contained in the prefix
    if (prefix != null && matchedPrefix == null) return undefined;

    for (const {method, handler, match, exact} of registrations) {
      if (method !== REQUEST_METHOD_ANY && method !== request.method) {
        continue;
      }

      const matchDetails = getMatchDetails(
        url,
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
