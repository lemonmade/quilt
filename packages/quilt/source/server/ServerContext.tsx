import type {PropsWithChildren} from 'react';

import {InitialURLContext} from '@quilted/react-router';
import {
  BrowserDetailsContext,
  type BrowserDetails,
} from '@quilted/react-browser/server';

interface Props {
  url?: string | URL;
  browser?: BrowserDetails;
}

export function ServerContext({
  url,
  browser,
  children,
}: PropsWithChildren<Props>) {
  const normalizedUrl = typeof url === 'string' ? new URL(url) : url;

  const withInitialURL = normalizedUrl ? (
    <InitialURLContext.Provider value={normalizedUrl}>
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

  return withBrowser;
}
