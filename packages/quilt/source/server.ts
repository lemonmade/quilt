export * from '@quilted/react-browser/server';

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
export {parseAcceptLanguageHeader} from '@quilted/react-localize';
export {createRequestRouterLocalization} from '@quilted/react-localize/request-router';

export {renderToResponse} from './server/request-router.tsx';
