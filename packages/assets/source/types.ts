export interface Asset {
  source: string;
  content?: string;
  attributes?: Record<string, string | boolean | number>;
}

export type AssetLoadTiming = 'never' | 'preload' | 'load';

export interface BrowserAssetSelector {
  id?: string;
  request?: Request;
}

export interface BrowserAssets {
  entry(
    options?: Pick<BrowserAssetSelector, 'id' | 'request'>,
  ): BrowserAssetsEntry;
  modules(
    modules: Iterable<string>,
    options?: Pick<BrowserAssetSelector, 'request'>,
  ): readonly BrowserAssetsEntry[];
}

export interface BrowserAssetsEntry {
  /**
   * The JavaScript file for this entry.
   */
  readonly script?: {
    readonly asset: Asset;
    readonly syncDependencies: readonly Asset[];
    readonly asyncDependencies: readonly Asset[];
  };

  /**
   * The CSS stylesheets for this entry.
   */
  readonly style?: {
    readonly asset: Asset;
    readonly syncDependencies: readonly Asset[];
    readonly asyncDependencies: readonly Asset[];
  };
}
