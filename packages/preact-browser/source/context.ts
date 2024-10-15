import {createOptionalContext} from '@quilted/preact-context';
import type {BrowserDetails} from '@quilted/browser';
import type {BrowserAssets} from '@quilted/assets';

export const BrowserDetailsContext = createOptionalContext<BrowserDetails>();
export const useBrowserDetails = BrowserDetailsContext.use;

export const BrowserAssetsManifestContext =
  createOptionalContext<BrowserAssets>();
export const useBrowserAssetsManifest = BrowserAssetsManifestContext.use;
