import type {PropsWithChildren} from 'react';

import {InitialUrlContext} from '@quilted/react-router';
import {HtmlContext} from '@quilted/react-html/server';
import type {HtmlManager} from '@quilted/react-html/server';
import {AsyncAssetContext} from '@quilted/react-async/server';
import type {AsyncAssetManager} from '@quilted/react-async/server';
import {HttpContext} from '@quilted/react-http/server';
import type {HttpManager} from '@quilted/react-http/server';

import {maybeWrapContext} from '../utilities/react';

interface Props {
  url?: string | URL;
  html?: HtmlManager;
  http?: HttpManager;
  asyncAssets?: AsyncAssetManager;
}

export function StaticContext({
  url,
  html,
  http,
  asyncAssets,
  children,
}: PropsWithChildren<Props>) {
  const normalizedUrl = typeof url === 'string' ? new URL(url) : url;

  return maybeWrapContext(
    AsyncAssetContext,
    asyncAssets,
    maybeWrapContext(
      HttpContext,
      http,
      maybeWrapContext(
        HtmlContext,
        html,
        maybeWrapContext(InitialUrlContext, normalizedUrl, children),
      ),
    ),
  );
}
