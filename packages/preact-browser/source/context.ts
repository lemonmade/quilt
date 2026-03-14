import {createContext} from 'preact';
import {useContext} from 'preact/hooks';

import type {BrowserDetails} from '@quilted/browser';
import type {BrowserAssets} from '@quilted/assets';
import {useQuiltContext} from '@quilted/preact-context';

declare module '@quilted/preact-context' {
  interface QuiltContext {
    /**
     * Details about the browser environment, including the current URL, cookies,
     * serialized server data, locale information, and methods to update the
     * document `<head>`. Available in both browser and server rendering contexts.
     *
     */
    readonly browser?: BrowserDetails;

    /**
     * The assets manifest for the application, used by async components to
     * load the JavaScript and CSS modules they need on demand.
     *
     */
    readonly assets?: BrowserAssets;
  }
}

export function useBrowserDetails(): BrowserDetails;
export function useBrowserDetails(options: {
  optional: boolean;
}): BrowserDetails | undefined;
export function useBrowserDetails(options?: {
  optional?: boolean;
}): BrowserDetails | undefined {
  return useQuiltContext('browser', options as any);
}

export function useBrowserAssetsManifest(): BrowserAssets;
export function useBrowserAssetsManifest(options: {
  optional: boolean;
}): BrowserAssets | undefined;
export function useBrowserAssetsManifest(options?: {
  optional?: boolean;
}): BrowserAssets | undefined {
  return useQuiltContext('assets', options as any);
}

export const BrowserEffectsAreActiveContext = createContext<boolean>(true);
export function useBrowserEffectsAreActive() {
  return useContext(BrowserEffectsAreActiveContext);
}
