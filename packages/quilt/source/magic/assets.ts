import type {AssetsCacheKey, BrowserAssets} from '@quilted/assets';

export declare function createBrowserAssets<
  CacheKey = AssetsCacheKey,
>(): BrowserAssets<CacheKey>;
