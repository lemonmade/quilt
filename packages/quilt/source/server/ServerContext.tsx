import type {PropsWithChildren} from 'react';

import {AssetsContext} from '@quilted/react-assets/server';
import type {AssetsManager} from '@quilted/react-assets/server';
import {InitialUrlContext} from '@quilted/react-router';
import {HtmlContext} from '@quilted/react-html/server';
import type {HtmlManager} from '@quilted/react-html/server';
import {AsyncAssetContext} from '@quilted/react-async/server';
import type {AsyncAssetManager} from '@quilted/react-async/server';
import {HttpServerContext} from '@quilted/react-http/server';
import type {HttpManager} from '@quilted/react-http/server';

import {maybeWrapContext} from '../utilities/react';

interface Props {
  url?: string | URL;
  html?: HtmlManager;
  http?: HttpManager;
  assets?: AssetsManager;
  asyncAssets?: AsyncAssetManager;
}

export function ServerContext({
  url,
  html,
  http,
  assets,
  asyncAssets,
  children,
}: PropsWithChildren<Props>) {
  const normalizedUrl = typeof url === 'string' ? new URL(url) : url;

  return maybeWrapContext(
    AssetsContext,
    assets,
    maybeWrapContext(
      AsyncAssetContext,
      asyncAssets,
      maybeWrapContext(
        HttpServerContext,
        http,
        maybeWrapContext(
          HtmlContext,
          html,
          maybeWrapContext(InitialUrlContext, normalizedUrl, children),
        ),
      ),
    ),
  );
}
