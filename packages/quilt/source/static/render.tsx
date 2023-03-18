import type {ReactElement} from 'react';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {HtmlManager} from '@quilted/react-html/server';
import {HttpManager} from '@quilted/react-http/server';
import {AsyncAssetManager} from '@quilted/react-async/server';
import {AssetsManager} from '@quilted/react-assets/server';
import type {AssetsCacheKey} from '@quilted/assets';

import {StaticContext} from './StaticContext';

interface Options<CacheKey = AssetsCacheKey> extends ExtractOptions {
  url?: string | URL;
  cacheKey?: CacheKey;
  headers?: NonNullable<
    ConstructorParameters<typeof HttpManager>[0]
  >['headers'];
}

export async function renderApp<CacheKey = AssetsCacheKey>(
  app: ReactElement<any>,
  {decorate, url, headers, cacheKey, ...rest}: Options<CacheKey> = {},
) {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();
  const http = new HttpManager({headers});
  const assets = new AssetsManager<CacheKey>({cacheKey});

  const markup = await extract(app, {
    decorate(app) {
      return (
        <StaticContext
          asyncAssets={asyncAssets}
          html={html}
          http={http}
          url={url}
        >
          {decorate?.(app) ?? app}
        </StaticContext>
      );
    },
    ...rest,
  });

  return {markup, http, html, assets, asyncAssets};
}
