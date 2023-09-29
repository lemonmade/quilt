import type {
  AssetsCacheKey,
  BrowserAssets as BrowserAssetsType,
} from '@quilted/assets';

export declare const BrowserAssets: {
  new <CacheKey = AssetsCacheKey>(): BrowserAssetsType<CacheKey>;
};
