import type {
  AssetsCacheKey,
  BrowserAssets,
  BrowserAssetsEntry,
} from '@quilted/assets';
import {
  JSONResponse,
  type EnhancedRequest,
  type RequestHandler,
  type RequestContext,
} from '@quilted/request-router';

export interface AssetPreloadOptions<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
> {
  readonly assets: BrowserAssets<CacheKey>;
  cacheKey?(
    request: EnhancedRequest,
    context: Context,
  ): CacheKey | Promise<CacheKey>;
}

export function createAssetPreloader<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(options: AssetPreloadOptions<Context, CacheKey>): RequestHandler<Context> {
  return async function handler(request, requestContext) {
    const manifest = await assetsForRequest<Context, CacheKey>(request, {
      ...options,
      context: requestContext,
    });

    return new JSONResponse(manifest);
  };
}

async function assetsForRequest<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  request: EnhancedRequest,
  {
    assets,
    context,
    cacheKey: getCacheKey,
  }: AssetPreloadOptions<Context, CacheKey> & {context: Context},
) {
  const url = new URL(request.url);
  const modules = url.searchParams.get('modules')?.split(',') ?? [];
  const includeStyles = url.searchParams.get('styles') !== 'false';
  const includeScripts = url.searchParams.get('scripts') !== 'false';

  const cacheKey =
    (await getCacheKey?.(request, context)) ??
    ((await assets.cacheKey?.(request)) as CacheKey);

  const {styles, scripts} = await assets.entry({
    modules,
    cacheKey,
  });

  const result: Partial<BrowserAssetsEntry> = {};

  if (includeStyles) (result as any).styles = styles;
  if (includeScripts) (result as any).scripts = scripts;

  return result as Partial<BrowserAssetsEntry>;
}
