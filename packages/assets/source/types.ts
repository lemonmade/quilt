export interface Asset {
  source: string;
  attributes?: Record<string, string | boolean | number>;
}

export type AssetLoadTiming = 'never' | 'preload' | 'load';

export interface BrowserAssetSelector {
  id?: string;
  modules?: Iterable<
    BrowserAssetModuleSelector | BrowserAssetModuleSelector['id']
  >;
  request?: Request;
}

export interface BrowserAssetModuleSelector {
  id: string;
  styles?: boolean;
  scripts?: boolean;
}

export interface BrowserAssets {
  entry(options?: BrowserAssetSelector): BrowserAssetsEntry;
  modules(
    modules: NonNullable<BrowserAssetSelector['modules']>,
    options?: Pick<BrowserAssetSelector, 'request'>,
  ): BrowserAssetsEntry;
}

export interface BrowserAssetsEntry {
  styles: Asset[];
  scripts: Asset[];
}
