import type {RenderableProps, VNode} from 'preact';

import {
  BrowserDetailsContext,
  type BrowserDetails,
} from '@quilted/preact-browser/server';

interface Props {
  browser?: BrowserDetails;
}

export function ServerContext({browser, children}: RenderableProps<Props>) {
  const withBrowser = browser ? (
    <BrowserDetailsContext.Provider value={browser}>
      {children}
    </BrowserDetailsContext.Provider>
  ) : (
    children
  );

  return withBrowser as VNode<{}>;
}
