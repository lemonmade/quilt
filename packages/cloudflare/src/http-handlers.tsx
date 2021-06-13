import type {ComponentType} from 'react';

import {getAssetFromKV} from '@cloudflare/kv-asset-handler';

import {renderApp, render, Html} from '@quilted/quilt/server';
import type {AssetLoader} from '@quilted/quilt/server';

export interface FetchEvent {
  request: Request;
}

export function createEventHandler(
  App: ComponentType<Record<string, never>>,
  {assets, assetBaseUrl}: {assets: AssetLoader<unknown>; assetBaseUrl: string},
) {
  return async (event: FetchEvent) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith(assetBaseUrl)) {
      const assetResponse = await getAssetFromKV(event, {
        cacheControl: {
          edgeTTL: 365 * 24 * 60 * 60,
        },
      });

      return assetResponse;
    }

    const {
      html: htmlManager,
      http,
      markup,
      asyncAssets,
    } = await renderApp(<App />, {
      url,
      headers: event.request.headers,
    });

    const {headers, statusCode = 200} = http.state;

    const usedAssets = asyncAssets.used({timing: 'load'});
    const assetOptions = {userAgent: event.request.headers.get('User-Agent')};

    const [styles, scripts, preload] = await Promise.all([
      assets.styles({async: usedAssets, options: assetOptions}),
      assets.scripts({async: usedAssets, options: assetOptions}),
      assets.asyncAssets(asyncAssets.used({timing: 'preload'}), {
        options: assetOptions,
      }),
    ]);

    const html = render(
      <Html
        manager={htmlManager}
        styles={styles}
        scripts={scripts}
        preloadAssets={preload}
      >
        {markup}
      </Html>,
    );

    return new Response(html, {
      status: statusCode,
      headers: new Headers(Object.fromEntries(headers)),
    });
  };
}
