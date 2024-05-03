import type {PropsWithChildren} from 'react';

import {InitialURLContext} from '@quilted/react-router';
import {
  BrowserDetailsContext,
  type BrowserDetails,
} from '@quilted/react-browser/server';

interface Props {
  browser?: BrowserDetails;
}

export function ServerContext({browser, children}: PropsWithChildren<Props>) {
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

  return withBrowser;
}
