import type {
  RequestRouter,
  RequestHandler,
} from '@quilted/quilt/request-router';
import type {
  Fetcher,
  ExportedHandlerFetchHandler,
} from '@cloudflare/workers-types';

import {createFetchHandler, type RequestHandlerOptions} from './fetch.ts';

export interface PagesAssetOptions {
  /**
   * The path on your domain where your static assets should be served from.
   * The resulting `fetch` function will only attempt to serve static assets
   * under this path.
   */
  path?: string;
}

export interface PagesRequestHandlerOptions extends RequestHandlerOptions {
  /**
   * Options for serving assets from this worker.
   */
  assets?: PagesAssetOptions;
}

/**
 * Creates a Cloudflare Worker request handler from a Quilt HTTP handler,
 * with special handling for the Cloudflare cache and static assets.
 */
export function createPagesFetchHandler<
  Env extends Record<string, any> = Record<string, unknown> & {ASSETS: Fetcher},
>(
  handler: RequestRouter | RequestHandler,
  {cache, assets = {}}: PagesRequestHandlerOptions = {},
): ExportedHandlerFetchHandler<Env> {
  const basePath = assets.path ?? '/assets/';
  const baseFetch = createFetchHandler(handler, {cache});

  return async (request, env, context) => {
    if (assets) {
      const {pathname} = new URL(request.url);

      if (pathname.startsWith(basePath)) {
        let assetResponse: Response = await env.ASSETS.fetch(request);

        // Clone response and add immutable Cache-Control header, since assets
        // have content-based hashes.
        if (assetResponse.ok) {
          assetResponse = new Response(assetResponse.body, assetResponse);
          assetResponse.headers.set(
            'Cache-Control',
            'public, max-age=31536000, immutable',
          );
        }

        return assetResponse as any;
      }
    }

    return baseFetch(request as any, env, context);
  };
}
