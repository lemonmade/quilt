import type {ComponentType} from 'react';

import type {AssetLoader} from '@quilted/async/server';
import {render, Html} from '@quilted/react-html/server';

import {createHttpHandler, html} from '@quilted/http-handlers';
import type {HttpHandler} from '@quilted/http-handlers';

import {renderApp} from './render';

export interface Options {
  assets: AssetLoader<unknown>;
  handler?: HttpHandler;
}

export function createServerRenderingHttpHandler(
  App: ComponentType<Record<string, never>>,
  {assets, handler = createHttpHandler()}: Options,
) {
  handler.get(async (request) => {
    const {
      html: htmlManager,
      http,
      markup,
      asyncAssets,
    } = await renderApp(<App />, {
      url: request.url,
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

    return html(
      render(
        <Html
          manager={htmlManager}
          styles={styles}
          scripts={scripts}
          preloadAssets={preload}
        >
          {markup}
        </Html>,
      ),
      {
        headers: Object.fromEntries([...headers]),
        status: statusCode,
      },
    );
  });
}
