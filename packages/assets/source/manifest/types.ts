export type AssetBuildAssetType = /** style */ 1 | /** script */ 2;

export interface AssetBuildManifest {
  key?: string;
  priority?: number;
  base?: string;
  attributes?: {
    [K in AssetBuildAssetType]?: Record<string, string | boolean | number>;
  };
  entries: {
    '.': string;
    [key: string]: string;
  };
  modules: Record<string, number[]>;
  assets: AssetBuildAsset[];
}

export type AssetBuildAsset = [
  type: AssetBuildAssetType,
  path: string,
  integrityOrIntegrity?: string,
  attributes?: {textContent: string; [key: string]: string | boolean | number},
];
