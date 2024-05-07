import type {RenderableProps, VNode} from 'preact';

import {InitialURLContext} from '@quilted/preact-router';
import {
  BrowserDetailsContext,
  type BrowserDetails,
} from '@quilted/preact-browser/server';

interface Props {
  browser?: BrowserDetails;
}

export function ServerContext({browser, children}: RenderableProps<Props>) {
  const requestURL = browser?.request.url;
  const initialURL = requestURL && new URL(requestURL);

  const withInitialURL = initialURL ? (
    <InitialURLContext.Provider value={initialURL}>
      {children}
    </InitialURLContext.Provider>
  ) : (
    children
  );

  const withBrowser = browser ? (
    <BrowserDetailsContext.Provider value={browser}>
      {withInitialURL}
    </BrowserDetailsContext.Provider>
  ) : (
    withInitialURL
  );

  return withBrowser as VNode<{}>;
}
