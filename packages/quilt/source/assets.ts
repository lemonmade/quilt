export {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  createBrowserAssetsEntryFromManifest,
  createBrowserAssetsFromManifests,
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
export {useAssetsCacheKey, useModuleAssets} from '@quilted/react-assets';

declare module '@quilted/assets' {
  interface AssetsCacheKey {
    browserGroup?: string;
  }
}
