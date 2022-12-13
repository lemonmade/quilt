import type {} from '@quilted/quilt';
import {notFound, runHandler} from '@quilted/quilt/http-handlers';
import type {HttpHandler, RequestHandler} from '@quilted/quilt/http-handlers';

import {getAssetFromKV} from './forked/kv-asset-handler';

export type {CloudflareRequestContext} from './types';

export interface AssetOptions {
  /**
   * The path on your domain where your static assets should be served from.
   * The resulting `fetch` function will only attempt to serve static assets
   * under this path.
   */
  path: string;

  /**
   * The [KV Namespace](https://developers.cloudflare.com/workers/runtime-apis/kv)
   * that holds your assets. If not specified, this function will use `__STATIC_CONTENT`,
   * which is the default namespace Cloudflare uses for Cloudflare Site assets.
   */
  namespace?: string;
}

export interface RequestHandlerOptions {
  /**
   * Whether the resulting request handler will use the Cloudflare cache
   * for responses. When set to `true`, which is the default, the request
   * handler will check the cache for all incoming requests, and respond
   * with the cache result if found. You can use the `cache-control` header
   * (typically by using the `CacheControl` component and `useCacheControl`
   * hooks from `@quilted/quilt/http`) to customize the cache duration of
   * responses.
   */
  cache?: boolean;

  /**
   * Whether the resulting fetch handler should also fetch static assets
   * associated with this worker. By default, assets are not served. If you
   * want assets to be served, you must pass an option that lists at least
   * the path that assets are served from.
   */
  assets?: false | AssetOptions;
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
  handler: HttpHandler | RequestHandler,
  {cache: shouldCache = true, assets = false}: RequestHandlerOptions = {},
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

    if (assets) {
      const response = await respondWithAsset(request, env, context, assets);
      if (response) return response;
    }

    const response =
      (await runHandler(handler, request, {
        cf: request.cf,
        env,
        ...context,
      } as any)) ?? notFound();

    if (cache && response.headers.has('Cache-Control')) {
      context.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  };
}

const MAX_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * Attempts to respond to the passed request with a static asset stored in a
 * Cloudflare KV Store, typically when using Cloudflare Sites. The response
 * will use the Cloudflare cache when it can, and will serve a long, immutable
 * cache control directive, since assets produced by Quilt are all fingerprinted.
 *
 * The first three arguments are the same ones received by `fetch` handlers in the
 * modules Cloudflare Worker format. If you are writing a worker using the service
 * worker format instead, you can adapt the `FetchEvent` you receive to these arguments
 * using the `transformFetchEvent()` function.
 */
export async function respondWithAsset(
  request: Request,
  env: Record<string, unknown>,
  context: ExecutionContext,
  {path, namespace = '__STATIC_CONTENT'}: AssetOptions,
) {
  if (!new URL(request.url).pathname.startsWith(path)) return undefined;

  const assetResponse = await getAssetFromKV(request, context, {
    ASSET_NAMESPACE: env[namespace],
    cacheControl: {
      edgeTTL: MAX_MAX_AGE,
      browserTTL: MAX_MAX_AGE,
    },
    mapRequestToAsset(request) {
      const url = new URL(request.url);
      const rewrittenUrl = new URL(url.pathname.slice(path.length), url.origin);

      return new Request(rewrittenUrl.href, request);
    },
  });

  return assetResponse;
}

/**
 * Takes a `FetchEvent`, which is received as the first argument in a `fetch`
 * event listener, and returns the three arguments that would be received
 * by the equivalent `fetch` handler in a modules format Cloudflare Worker:
 *
 * 1. `request`, the request being handled; this is the same as `event.request`.
 * 2. `env`, globals available to your handler, like KV namespaces. In the service
 *    worker format, these properties are available on the global object, so this
 *    adaptor returns a proxy that delegates all property accesses to `globalThis`.
 * 3. `context`, which provides some additional functionality to your handler. These
 *    properties are mostly exposed on the `FetchEvent` in the service worker format,
 *    so this function delegates to the event as needed.
 *
 * The result of calling this function can be passed to `createRequestHandler()` and
 * `respondWithAsset()`, which require arguments with the signature of the newer
 * modules format.
 */
export function transformFetchEvent(
  event: FetchEvent,
): Parameters<ReturnType<typeof createFetchHandler>> {
  return [
    event.request,
    // In the new module format, the second argument has references to
    // KV Namespaces, whereas the service worker format has these as globals
    // instead. This shim replicates this behavior by forwarding all property
    // accesses to the global environment. It’s not perfect, but good enough!
    new Proxy(
      {},
      {
        get(_, property) {
          return Reflect.get(globalThis, property);
        },
      },
    ),
    {
      waitUntil(promise) {
        return event.waitUntil(promise);
      },
      passThroughOnException() {
        return event.passThroughOnException();
      },
    },
  ];
}
