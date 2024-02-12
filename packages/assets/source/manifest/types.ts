export interface AssetsBuildManifest {
  version: '0.1';
  cacheKey?: string;
  priority?: number;
  baseURL?: string;

  scripts: {
    assets: AssetBuildManifestAsset[];
    attributes?: Record<string, string | boolean | number>;
  };

  styles: {
    assets: AssetBuildManifestAsset[];
    attributes?: Record<string, string | boolean | number>;
  };

  // TODO: add a way to add additional entries
  entries: {default: AssetsBuildManifestEntry};
  modules: Record<string, AssetsBuildManifestEntry>;
}

export interface AssetBuildManifestAsset {
  file: string;
  integrity?: string;
}

export interface AssetsBuildManifestEntry {
  styles: number[];
  scripts: number[];
}
