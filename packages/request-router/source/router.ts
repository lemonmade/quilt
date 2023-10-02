import {HttpMethod} from '@quilted/http';
import {getMatchDetails} from '@quilted/routing';

import type {Match, Prefix} from '@quilted/routing';

import {EnhancedRequest} from './request.ts';
import type {EnhancedResponse} from './response.ts';
import type {ValueOrPromise, RequestContext} from './types.ts';

export interface RequestHandler<Context = RequestContext> {
  (
    request: EnhancedRequest,
    context: Context,
  ): ValueOrPromise<Response | EnhancedResponse | undefined | null>;
}

export type RequestRegistration<Context = RequestContext> =
  | RequestHandler<Context>
  | RequestRouter<Context>;

export interface RequestRegistrationOptions {
  exact?: boolean;
}

export interface RequestRouterOptions {
  readonly prefix?: Prefix;
}

interface RequestHandlerRegistration {
  readonly method: HttpMethod | typeof REQUEST_METHOD_ANY;
  readonly handler: RequestRegistration<any>;
  readonly exact: boolean;
  readonly match?: Match;
}

const REQUEST_METHOD_ANY = 'ANY';
const HTTP_HANDLER_FETCH_INTERNAL = Symbol.for(
  'Quilt.RequestRouter.FetchInternal',
);

export class RequestRouter<Context = RequestContext> {
  private prefix?: Prefix;
  private registrations: RequestHandlerRegistration[] = [];

  constructor({prefix}: RequestRouterOptions = {}) {
    this.prefix = prefix;
  }

  any(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  any(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  any(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      REQUEST_METHOD_ANY,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  head(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  head(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  head(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Head,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  get(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  get(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  get(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Get,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  post(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  post(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Post,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  options(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  options(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Options,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  put(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  put(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  put(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Put,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  patch(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  patch(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Patch,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  delete(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  delete(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Delete,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  connect(
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    match: Match,
    handler: RequestRegistration<Context>,
    options?: RequestRegistrationOptions,
  ): this;
  connect(
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ): this {
    return this.register(
      HttpMethod.Connect,
      matchOrHandler,
      handlerOrOptions,
      options,
    );
  }

  async fetch(request: Request, requestContext = {} as any) {
    return this[HTTP_HANDLER_FETCH_INTERNAL](
      new EnhancedRequest(request),
      requestContext,
    );
  }

  async [HTTP_HANDLER_FETCH_INTERNAL](
    request: EnhancedRequest,
    context: RequestContext,
    previouslyConsumed?: string,
  ): Promise<Response | EnhancedResponse | undefined | null> {
    const {prefix, registrations} = this;

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
          : await handler[HTTP_HANDLER_FETCH_INTERNAL](
              request,
              context,
              matchDetails.consumed,
            );

      if (result) return result;
    }
  }

  private register(
    method: HttpMethod | typeof REQUEST_METHOD_ANY,
    matchOrHandler: Match | RequestRegistration<Context>,
    handlerOrOptions?:
      | RequestRegistration<Context>
      | RequestRegistrationOptions,
    options?: RequestRegistrationOptions,
  ) {
    let registration: RequestHandlerRegistration;

    const firstArgumentIsRouter = isRequestRouter(matchOrHandler);

    if (firstArgumentIsRouter || typeof matchOrHandler === 'function') {
      // There is no `match`...
      registration = {
        method,
        handler: matchOrHandler as RequestRegistration<Context>,
        exact:
          isRequestRouter(matchOrHandler) ||
          ((handlerOrOptions as RequestRegistrationOptions | undefined)
            ?.exact ??
            true),
      };
    } else if (isRequestRouter(handlerOrOptions)) {
      // There is a `match`, `RequestRouter`, and maybe `options` (no options
      // respected for now)...
      registration = {
        method,
        match: matchOrHandler as Match,
        handler: handlerOrOptions,
        exact: false,
      };
    } else {
      // There is a `match`, `RequestHandler`, and maybe `options`...
      registration = {
        method,
        match: matchOrHandler as Match,
        handler: handlerOrOptions as RequestRegistration<Context>,
        exact: options?.exact ?? true,
      };
    }

    this.registrations.push(registration);
    return this;
  }
}

function isRequestRouter<Context = unknown>(
  value?: unknown,
): value is RequestRouter<Context> {
  return (
    value != null &&
    typeof value === 'object' &&
    (value instanceof RequestRouter ||
      Reflect.has(value, HTTP_HANDLER_FETCH_INTERNAL))
  );
}
