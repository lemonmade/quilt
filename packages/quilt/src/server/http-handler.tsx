import type {ComponentType} from 'react';

import type {AssetLoader} from '@quilted/async/server';
import {render as renderToString, Html} from '@quilted/react-html/server';

import {createHttpHandler, html, redirect} from '@quilted/http-handlers';
import type {
  Request,
  HttpHandler,
  RequestHandler,
} from '@quilted/http-handlers';

import {renderApp} from './render';

export interface Options<Props = Record<string, never>> {
  assets: AssetLoader<unknown>;
  handler?: HttpHandler;
  renderProps?(options: {request: Request}): Props;
}

export function createServerRenderingRequestHandler<Props>(
  App: ComponentType<Props>,
  {
    assets,
    renderProps = () => ({} as any),
  }: Pick<Options<Props>, 'assets' | 'renderProps'>,
): RequestHandler {
  return async (request) => {
    const accepts = request.headers.get('Accept');

    if (accepts != null && !accepts.includes('text/html')) return;

    const {
      html: htmlManager,
      http,
      markup,
      asyncAssets,
    } = await renderApp(<App {...renderProps?.({request})} />, {
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
      renderToString(
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

export function createServerRenderingHttpHandler<Props>(
  App: ComponentType<Props>,
  {assets, renderProps, handler = createHttpHandler()}: Options<Props>,
) {
  handler.get(createServerRenderingRequestHandler(App, {assets, renderProps}));
  return handler;
}
