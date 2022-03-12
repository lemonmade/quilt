import type {ComponentType} from 'react';

import type {AssetLoader} from '@quilted/async/server';
import {render, Html} from '@quilted/react-html/server';

import {createHttpHandler, html, redirect} from '@quilted/http-handlers';
import type {
  HttpHandler,
  RequestHandler,
  HttpHandlerOptions,
} from '@quilted/http-handlers';

import {renderApp} from './render';

export interface Options extends Pick<HttpHandlerOptions, 'before'> {
  assets: AssetLoader<unknown>;
  handler?: HttpHandler;
}

export function createServerRenderingRequestHandler(
  App: ComponentType<any>,
  {assets}: Pick<Options, 'assets'>,
): RequestHandler {
  return async (request) => {
    const accepts = request.headers.get('Accept');

    if (accepts != null && !accepts.includes('text/html')) return;

    const {
      html: htmlManager,
      http,
      markup,
      asyncAssets,
    } = await renderApp(<App />, {
      url: request.url,
      headers: request.headers,
    });

    const {headers, statusCode = 200, redirectUrl} = http.state;

    if (redirectUrl) {
      return redirect(redirectUrl, {
        status: statusCode as 301,
        headers,
      });
    }

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
        headers,
        status: statusCode,
      },
    );
  };
}

export function createServerRenderingHttpHandler(
  App: ComponentType<any>,
  {assets, before, handler = createHttpHandler({before})}: Options,
) {
  handler.get(createServerRenderingRequestHandler(App, {assets}));
  return handler;
}
