import type {
  RequestRouter,
  RequestHandler,
} from '@quilted/quilt/request-router';
import {getAssetFromKV} from '@cloudflare/kv-asset-handler';

import {createFetchHandler, type RequestHandlerOptions} from './fetch';

export interface SiteAssetOptions {
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

export interface SiteRequestHandlerOptions extends RequestHandlerOptions {
  /**
   * Whether the resulting fetch handler should also fetch static assets
   * associated with this worker. By default, assets are not served. If you
   * want assets to be served, you must pass an option that lists at least
   * the path that assets are served from.
   */
  assets?: false | SiteAssetOptions;
}

/**
 * Creates a Cloudflare Worker request handler from a Quilt HTTP handler,
 * with special handling for the Cloudflare cache and static assets.
 */
export function createSiteFetchHandler<
  Env extends Record<string, any> = Record<string, unknown>,
>(
  handler: RequestRouter | RequestHandler,
  {cache, assets = false}: SiteRequestHandlerOptions = {},
): ExportedHandlerFetchHandler<Env> {
  const baseFetch = createFetchHandler(handler, {cache});

  return async (
    request: Request & {cf?: IncomingRequestCfProperties},
    env,
    context,
  ) => {
    if (assets) {
      const response = await respondWithSiteAsset(
        request,
        env,
        context,
        assets,
      );
      if (response) return response;
    }

    return baseFetch(request, env, context);
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
export async function respondWithSiteAsset(
  request: Request,
  env: Record<string, unknown>,
  context: ExecutionContext,
  {path, namespace = '__STATIC_CONTENT'}: SiteAssetOptions,
) {
  if (!new URL(request.url).pathname.startsWith(path)) return undefined;

  const assetResponse = await getAssetFromKV(
    {request, waitUntil: context.waitUntil},
    {
      ASSET_NAMESPACE: env[namespace],
      cacheControl: {
        edgeTTL: MAX_MAX_AGE,
        browserTTL: MAX_MAX_AGE,
      },
      mapRequestToAsset(request) {
        const url = new URL(request.url);
        const rewrittenUrl = new URL(
          url.pathname.slice(path.length),
          url.origin,
        );

        return new Request(rewrittenUrl.href, request);
      },
    },
  );

  return assetResponse;
}
