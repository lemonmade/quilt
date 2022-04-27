import type {ComponentType, ReactElement} from 'react';

import type {AssetManifest} from '@quilted/async/server';
import {render as renderToString, Html} from '@quilted/react-html/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';

import {createHttpHandler, html, redirect} from '@quilted/http-handlers';
import type {
  Request,
  HttpHandler,
  RequestHandler,
} from '@quilted/http-handlers';

import {renderApp} from './render';

export interface Options<Props = Record<string, never>> extends ExtractOptions {
  assets?: AssetManifest<unknown>;
  handler?: HttpHandler;
  renderProps?(options: {request: Request}): Props;
}

export function createServerRenderingHttpHandler<Props>(
  App: ComponentType<Props>,
  {handler = createHttpHandler(), ...options}: Options<Props>,
) {
  handler.get(createServerRenderingRequestHandler(App, options));
  return handler;
}

export function createServerRenderingRequestHandler<Props>(
  App: ComponentType<Props>,
  {renderProps, ...options}: Omit<Options<Props>, 'handler'> = {},
): RequestHandler {
  return (request) => {
    return renderToResponse(
      <App {...(renderProps?.({request}) as any)} />,
      request,
      options,
    );
  };
}

export async function renderToResponse<Props>(
  element: ReactElement<Props>,
  request: Request,
  {assets, ...options}: Omit<Options<Props>, 'handler' | 'renderProps'> = {},
) {
  const accepts = request.headers.get('Accept');

  if (accepts != null && !accepts.includes('text/html')) return;

  const {
    html: htmlManager,
    http,
    markup,
    asyncAssets,
  } = await renderApp(element, {
    ...options,
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

  const [styles, scripts, preload] = assets
    ? await Promise.all([
        assets.styles({async: usedAssets, options: assetOptions}),
        assets.scripts({async: usedAssets, options: assetOptions}),
        assets.asyncAssets(asyncAssets.used({timing: 'preload'}), {
          options: assetOptions,
        }),
      ])
    : [];

  return html(
    renderToString(
      <Html
        url={request.url}
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
}
