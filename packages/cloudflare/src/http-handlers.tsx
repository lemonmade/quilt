import {notFound} from '@quilted/http-handlers';
import type {HttpHandler} from '@quilted/http-handlers';

import {getAssetFromKV} from './forked/kv-asset-handler';
import type {
  WorkerRequestContext,
  KVNamespaceBinding,
} from './forked/kv-asset-handler';

export function createRequestHandler(handler: HttpHandler) {
  return async (
    request: Request,
    _env: Record<string, KVNamespaceBinding>,
    _context: WorkerRequestContext,
  ) => {
    const body = await request.text();

    const response =
      (await handler.run({
        headers: request.headers,
        method: request.method,
        body,
        url: new URL(request.url),
      })) ?? notFound();

    return new Response(response.body, {
      status: response.status,
      headers: new Headers([...response.headers]),
    });
  };
}

export interface AssetOptions {
  assetsPath: string;
  assetNamespace?: string;
}

export async function respondWithAsset(
  request: Request,
  env: Record<string, KVNamespaceBinding>,
  context: WorkerRequestContext,
  {assetsPath, assetNamespace = '__STATIC_CONTENT'}: AssetOptions,
) {
  if (!new URL(request.url).pathname.startsWith(assetsPath)) return undefined;

  const assetResponse = await getAssetFromKV(request, context, {
    ASSET_NAMESPACE: env[assetNamespace],
    cacheControl: {
      edgeTTL: 365 * 24 * 60 * 60,
    },
    mapRequestToAsset(request) {
      const url = new URL(request.url);
      const rewrittenUrl = new URL(
        url.pathname.slice(assetsPath.length),
        url.origin,
      );

      return new Request(rewrittenUrl.href, request);
    },
  });

  return assetResponse;
}
