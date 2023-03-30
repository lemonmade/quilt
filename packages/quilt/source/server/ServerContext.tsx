import type {PropsWithChildren} from 'react';

import {AssetsContext, type AssetsManager} from '@quilted/react-assets/server';
import {InitialUrlContext} from '@quilted/react-router';
import {HtmlContext, type HtmlManager} from '@quilted/react-html/server';
import {HttpServerContext, type HttpManager} from '@quilted/react-http/server';

import {maybeWrapContext} from '../utilities/react.tsx';

interface Props {
  url?: string | URL;
  html?: HtmlManager;
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

  return maybeWrapContext(
    AssetsContext,
    assets,
    maybeWrapContext(
      HttpServerContext,
      http,
      maybeWrapContext(
        HtmlContext,
        html,
        maybeWrapContext(InitialUrlContext, normalizedUrl, children),
      ),
    ),
  );
}
