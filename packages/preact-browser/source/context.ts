import {createContext} from 'preact';
import {useContext} from 'preact/hooks';

import {createOptionalContext} from '@quilted/preact-context';
import type {BrowserDetails} from '@quilted/browser';
import type {BrowserAssets} from '@quilted/assets';

export const BrowserDetailsContext = createOptionalContext<BrowserDetails>();
export const useBrowserDetails = BrowserDetailsContext.use;

export const BrowserAssetsManifestContext =
  createOptionalContext<BrowserAssets>();
export const useBrowserAssetsManifest = BrowserAssetsManifestContext.use;

export const BrowserEffectsAreActiveContext = createContext<boolean>(true);
export const useBrowserEffectsAreActive = () =>
  useContext(BrowserEffectsAreActiveContext);
