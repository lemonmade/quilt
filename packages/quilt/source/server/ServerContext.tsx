import type {PropsWithChildren} from 'react';

import {AssetsContext, type AssetsManager} from '@quilted/react-assets/server';
import {InitialUrlContext} from '@quilted/react-router';
import {HTMLContext, type HTMLManager} from '@quilted/react-html/server';
import {HttpServerContext, type HttpManager} from '@quilted/react-http/server';

interface Props {
  url?: string | URL;
  html?: HTMLManager;
  http?: HttpManager;
  assets?: AssetsManager;
}

export function ServerContext({
  url,
  html,
  http,
  assets,
  children,
}: PropsWithChildren<Props>) {
  const normalizedUrl = typeof url === 'string' ? new URL(url) : url;

  const withInitialURL = normalizedUrl ? (
    <InitialUrlContext.Provider value={normalizedUrl}>
      {children}
    </InitialUrlContext.Provider>
  ) : (
    children
  );

  const withHTML = html ? (
    <HTMLContext.Provider value={html}>{withInitialURL}</HTMLContext.Provider>
  ) : (
    withInitialURL
  );

  const withHTTPServer = http ? (
    <HttpServerContext.Provider value={http}>
      {withHTML}
    </HttpServerContext.Provider>
  ) : (
    withHTML
  );

  const withAssets = assets ? (
    <AssetsContext.Provider value={assets}>
      {withHTTPServer}
    </AssetsContext.Provider>
  ) : (
    withHTTPServer
  );

  return withAssets;
}
