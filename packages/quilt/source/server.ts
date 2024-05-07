export {
  renderToString,
  renderToStringAsync,
  renderToStaticMarkup,
} from 'preact-render-to-string';
export * from '@quilted/preact-browser/server';

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
export {parseAcceptLanguageHeader} from '@quilted/preact-localize';
export {createRequestRouterLocalization} from '@quilted/preact-localize/request-router';

export {renderToResponse} from './server/request-router.tsx';
