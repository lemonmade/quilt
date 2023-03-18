import type {AssetsCacheKey} from '../cache-key';

export interface AssetsBuildManifest<CacheKey = AssetsCacheKey> {
  id?: string;
  cacheKey?: CacheKey;
  attributes?: {
    styles?: Record<string, string | boolean | number>;
    scripts?: Record<string, string | boolean | number>;
  };

  assets: string[];
  // TODO: add a way to add additional entries
  entries: {default: AssetsBuildManifestEntry};
  modules: Record<string, AssetsBuildManifestEntry>;
}

export interface AssetsBuildManifestEntry {
  styles: number[];
  scripts: number[];
}
