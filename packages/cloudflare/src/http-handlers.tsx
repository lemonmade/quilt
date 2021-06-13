import type {ComponentType} from 'react';

import {renderApp, render, Html} from '@quilted/quilt/server';
import type {AssetLoader} from '@quilted/quilt/server';

import {getAssetFromKV} from './forked/kv-asset-handler';
import type {
  WorkerRequestContext,
  KVNamespaceBinding,
} from './forked/kv-asset-handler';

export interface Options {
  assets: AssetLoader<unknown>;
  assetsPath: string;
  assetNamespace?: string;
}

export function createEventHandler(
  App: ComponentType<Record<string, never>>,
  {assets, assetsPath, assetNamespace = '__STATIC_CONTENT'}: Options,
) {
  return async (
    request: Request,
    env: Record<string, KVNamespaceBinding>,
    context: WorkerRequestContext,
  ) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith(assetsPath)) {
      const assetResponse = await getAssetFromKV(request, context, {
        ASSET_NAMESPACE: env[assetNamespace],
        cacheControl: {
          edgeTTL: 365 * 24 * 60 * 60,
        },
        mapRequestToAsset(request) {
          const url = new URL(request.url);
          const rewrittenUrl = new URL(
            url.pathname.slice(assetsPath.length),
            url.origin,
          );

          return new Request(rewrittenUrl.href, request);
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
      headers: request.headers,
    });

    const {headers, statusCode = 200} = http.state;

    const usedAssets = asyncAssets.used({timing: 'load'});
    const assetOptions = {userAgent: request.headers.get('User-Agent')};

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
