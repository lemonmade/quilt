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
    const {
      html: htmlManager,
      http,
      markup,
      asyncAssets,
    } = await renderApp(<App />, {
      url: request.url,
      headers: request.headers,
    });

    const {headers, cookies, statusCode = 200, redirectUrl} = http.state;

    if (redirectUrl) {
      const response = redirect(redirectUrl, {
        status: statusCode as 301,
        headers,
      });

      for (const [name, {value, ...options}] of cookies.records()) {
        response.cookies.set(name, value, options);
      }

      return response;
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

    const response = html(
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

    for (const [name, {value, ...options}] of cookies.records()) {
      response.cookies.set(name, value, options);
    }

    return response;
  };
}

export function createServerRenderingHttpHandler(
  App: ComponentType<any>,
  {assets, before, handler = createHttpHandler({before})}: Options,
) {
  handler.get(createServerRenderingRequestHandler(App, {assets}));
  return handler;
}
