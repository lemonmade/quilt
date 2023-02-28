import type {AssetManifest, AssetsEntry} from '@quilted/assets';
import {
  json,
  type EnhancedRequest,
  type RequestHandler,
  type RequestContext,
} from '@quilted/request-router';
import type {DefaultAssetContext} from '../assets';

export interface AssetPreloadOptions<
  Context = RequestContext,
  AssetContext = DefaultAssetContext,
> {
  readonly assets:
    | AssetManifest<AssetContext>
    | {
        readonly manifest: AssetManifest<AssetContext>;
        context?(
          request: EnhancedRequest,
          context: Context,
        ): AssetContext | undefined | Promise<AssetContext | undefined>;
      };
}

export function createAssetPreloader<
  Context = RequestContext,
  AssetContext = DefaultAssetContext,
>(
  options: AssetPreloadOptions<Context, AssetContext>,
): RequestHandler<Context> {
  return async function handler(request, requestContext) {
    const manifest = await assetsForRequest<Context, AssetContext>(request, {
      ...options,
      context: requestContext,
    });

    return json(manifest);
  };
}

async function assetsForRequest<
  Context = RequestContext,
  AssetContext = DefaultAssetContext,
>(
  request: EnhancedRequest,
  {
    assets,
    context,
  }: AssetPreloadOptions<Context, AssetContext> & {readonly context: Context},
) {
  const url = new URL(request.url);
  const async = url.searchParams.get('async')?.split(',') ?? [];
  const includeStyles = url.searchParams.get('styles') !== 'false';
  const includeScripts = url.searchParams.get('scripts') !== 'false';

  let manifest: AssetManifest<AssetContext>;
  let assetContext: AssetContext | undefined;

  if ('manifest' in assets) {
    manifest = assets.manifest;
    assetContext = await assets.context?.(request, context);
  } else {
    manifest = assets;
  }

  const {styles, scripts} = await manifest.assets({
    async,
    context:
      assetContext ??
      ({
        userAgent: request.headers.get('User-Agent') ?? undefined,
      } as AssetContext),
  });

  const result: Partial<AssetsEntry> = {};

  if (includeStyles) (result as any).styles = styles;
  if (includeScripts) (result as any).scripts = scripts;

  return result as Partial<AssetsEntry>;
}
