import './assets/files.ts';
import './assets/styles.ts';

export {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  BrowserAssetsFromManifests,
  createBrowserAssetsEntryFromManifest,
} from '@quilted/assets';
export type {
  Asset,
  AssetsCacheKey,
  BrowserAssets,
  BrowserAssetsEntry,
  BrowserAssetSelector,
  BrowserAssetModuleSelector,
  AssetsBuildManifest,
  AssetsBuildManifestEntry,
} from '@quilted/assets';

declare module '@quilted/assets' {
  interface AssetsCacheKey {
    browserGroup?: string;
  }
}
