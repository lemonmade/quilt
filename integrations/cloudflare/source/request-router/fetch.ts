import {NotFoundResponse, handleRequest} from '@quilted/quilt/request-router';
import type {
  RequestRouter,
  RequestHandler,
} from '@quilted/quilt/request-router';

export interface RequestHandlerOptions {
  /**
   * Whether the resulting request handler will use the Cloudflare cache
   * for responses. When set to `true`, which is the default, the request
   * handler will check the cache for all incoming requests, and respond
   * with the cache result if found. You can use the `Cache-Control` header
   * to customize the cache duration of responses.
   *
   * @default false
   */
  cache?: boolean;
}

/**
 * Creates a Cloudflare Worker request handler from a Quilt HTTP handler.
 * The request handler can be passed directly as the `fetch` handler for
 * Cloudflare Workers’ module format. If you are using the service worker
 * format, you can use the `transformFetchEvent()` function from this library
 * to adapt the `FetchEvent` type you get in your fetch event listener.
 */
export function createFetchHandler<
  Env extends Record<string, any> = Record<string, unknown>,
>(
  handler: RequestRouter | RequestHandler,
  {cache: shouldCache = false}: RequestHandlerOptions = {},
): ExportedHandlerFetchHandler<Env> {
  const cache = shouldCache
    ? (caches as any as {default: Cache}).default
    : undefined;

  return async (
    request: Request & {cf?: IncomingRequestCfProperties},
    env,
    context,
  ) => {
    if (cache) {
      const response = await cache.match(request);
      if (response) return response;
    }

    const response =
      (await handleRequest(handler, request, {
        cf: request.cf,
        env,
        ...context,
      } as any)) ?? new NotFoundResponse();

    if (cache && response.headers.has('Cache-Control')) {
      context.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  };
}
