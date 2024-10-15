import type {RenderableProps, VNode} from 'preact';

import {
  BrowserDetailsContext,
  BrowserAssetsManifestContext,
  type BrowserDetails,
} from '@quilted/preact-browser/server';

import {type BrowserAssets} from '@quilted/assets';

interface Props {
  browser?: BrowserDetails;
  assets?: BrowserAssets;
}

export function ServerContext({
  browser,
  assets,
  children,
}: RenderableProps<Props>) {
  const withBrowser = browser ? (
    <BrowserDetailsContext.Provider value={browser}>
      {children}
    </BrowserDetailsContext.Provider>
  ) : (
    children
  );

  const withAssets = assets ? (
    <BrowserAssetsManifestContext.Provider value={assets}>
      {withBrowser}
    </BrowserAssetsManifestContext.Provider>
  ) : (
    withBrowser
  );

  return withAssets as VNode<{}>;
}
