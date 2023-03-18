import type {AssetsCacheKey} from './cache-key';

export interface Asset {
  source: string;
  attributes?: Record<string, string | boolean | number>;
}

export interface BrowserAssetSelector<CacheKey = AssetsCacheKey> {
  modules?: Iterable<
    BrowserAssetModuleSelector | BrowserAssetModuleSelector['id']
  >;
  cacheKey?: CacheKey;
}

export interface BrowserAssetModuleSelector {
  id: string | RegExp;
  styles?: boolean;
  scripts?: boolean;
}

export interface BrowserAssets<CacheKey = AssetsCacheKey> {
  entry(
    options?: BrowserAssetSelector<CacheKey>,
  ): BrowserAssetsEntry | Promise<BrowserAssetsEntry>;
  modules(
    modules: NonNullable<BrowserAssetSelector<CacheKey>['modules']>,
    options?: Pick<BrowserAssetSelector<CacheKey>, 'cacheKey'>,
  ): BrowserAssetsEntry | Promise<BrowserAssetsEntry>;
  cacheKey?(request: Request): Partial<CacheKey> | Promise<Partial<CacheKey>>;
}

export interface BrowserAssetsEntry {
  styles: Asset[];
  scripts: Asset[];
}
