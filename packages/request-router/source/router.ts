import {HttpMethod} from '@quilted/http';
import {getMatchDetails} from '@quilted/routing';

import type {Match, Prefix} from '@quilted/routing';

import {EnhancedRequest} from './request.ts';
import type {
  RequestRouter,
  RequestContext,
  RequestRegistration,
  RequestRegistrationOptions,
} from './types.ts';

export interface RequestRouterOptions {
  readonly prefix?: Prefix;
}

interface RequestHandlerRegistration {
  readonly method: HttpMethod | typeof REQUEST_METHOD_ANY;
  readonly handler: RequestRegistration;
  readonly exact: boolean;
  readonly match?: Match;
}

const REQUEST_METHOD_ANY = 'ANY';
const HTTP_HANDLER_FETCH_INTERNAL = Symbol.for(
  'Quilt.RequestRouter.FetchInternal',
);

export function createRequestRouter<Context = RequestContext>({
  prefix,
}: RequestRouterOptions = {}): RequestRouter<Context> {
  const registrations: RequestHandlerRegistration[] = [];

  const requestRouter: RequestRouter<Context> = {
    any(...args: any[]) {
      registrations.push(normalizeRouteArguments(REQUEST_METHOD_ANY, ...args));
      return requestRouter;
    },
    head(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Head, ...args));
      return requestRouter;
    },
    get(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Get, ...args));
      return requestRouter;
    },
    connect(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Connect, ...args));
      return requestRouter;
    },
    options(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Options, ...args));
      return requestRouter;
    },
    post(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Post, ...args));
      return requestRouter;
    },
    put(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Put, ...args));
      return requestRouter;
    },
    patch(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Patch, ...args));
      return requestRouter;
    },
    delete(...args: any[]) {
      registrations.push(normalizeRouteArguments(HttpMethod.Delete, ...args));
      return requestRouter;
    },
    async fetch(request, requestContext = {} as any) {
      return fetchInternal(new EnhancedRequest(request), requestContext);
    },
  };

  Reflect.defineProperty(requestRouter, HTTP_HANDLER_FETCH_INTERNAL, {
    enumerable: false,
    value: fetchInternal,
  });

  return requestRouter;

  async function fetchInternal(
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
          : await Reflect.get(handler, HTTP_HANDLER_FETCH_INTERNAL)(
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
  if (isRequestRouter(args[0]) || typeof args[0] === 'function') {
    return {
      method,
      handler: args[0],
      exact:
        isRequestRouter(args[0]) ||
        ((args[1] as RequestRegistrationOptions | undefined)?.exact ?? true),
    };
  }

  // There is a `match`, `RequestRouter`, and maybe `options` (no options
  // respected for now)...
  if (isRequestRouter(args[1])) {
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

function isRequestRouter(value?: unknown): value is RequestRouter {
  return (
    value != null &&
    typeof value === 'object' &&
    Reflect.has(value, HTTP_HANDLER_FETCH_INTERNAL)
  );
}
