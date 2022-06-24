import type {ReactElement} from 'react';

import type {AssetManifest} from '@quilted/async/server';
import {render as renderToString, Html} from '@quilted/react-html/server';
import type {
  Options as ExtractOptions,
  ServerRenderRequestContext,
} from '@quilted/react-server-render/server';

import {createHttpHandler, html, redirect} from '@quilted/http-handlers';
import type {
  HttpHandler,
  RequestHandler,
  RequestContext,
} from '@quilted/http-handlers';

import {renderApp} from './render';

export interface Options extends Omit<ExtractOptions, 'context'> {
  assets?: AssetManifest<unknown>;
  handler?: HttpHandler;
  context?(
    request: Request,
    context: RequestContext,
  ): ServerRenderRequestContext;
}

export function createServerRenderingHttpHandler(
  render: (
    request: Request,
    context: RequestContext,
  ) => ReactElement<any> | Promise<ReactElement<any>>,
  {handler = createHttpHandler(), ...options}: Options,
) {
  handler.get(createServerRenderingRequestHandler(render, options));
  return handler;
}

export function createServerRenderingRequestHandler(
  render: (
    request: Request,
    context: RequestContext,
  ) => ReactElement<any> | Promise<ReactElement<any>>,
  {context, ...options}: Omit<Options, 'handler'> = {},
): RequestHandler {
  return async (request, requestContext) => {
    const app = await render(request, requestContext);

    return renderToResponse(app, request, {
      ...options,
      context: context?.(request, requestContext) ?? (requestContext as any),
    });
  };
}

export async function renderToResponse(
  app: ReactElement<any>,
  request: Request,
  {assets, ...options}: Omit<Options, 'handler' | 'renderProps'> = {},
) {
  const accepts = request.headers.get('Accept');

  if (accepts != null && !accepts.includes('text/html')) return;

  const {
    html: htmlManager,
    http,
    markup,
    asyncAssets,
  } = await renderApp(app, {
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
        url={new URL(request.url)}
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
