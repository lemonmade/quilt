import type {ReactElement} from 'react';

import type {AssetManifest} from '@quilted/async/server';
import {render as renderToString, Html} from '@quilted/react-html/server';
import type {
  Options as ExtractOptions,
  ServerRenderRequestContext,
} from '@quilted/react-server-render/server';

import {createRequestRouter, html, redirect} from '@quilted/request-router';
import type {
  RequestRouter,
  EnhancedRequest,
  RequestHandler,
  RequestContext,
} from '@quilted/request-router';

import {renderApp} from './render';

export interface Options<Context = RequestContext>
  extends Omit<ExtractOptions, 'context'> {
  assets?: AssetManifest<unknown>;
  router?: RequestRouter<Context>;
  context?(
    request: EnhancedRequest,
    context: Context,
  ): ServerRenderRequestContext;
}

export function createServerRenderingRequestRouter<Context = RequestContext>(
  render: (
    request: EnhancedRequest,
    context: Context,
  ) => ReactElement<any> | Promise<ReactElement<any>>,
  {router = createRequestRouter<Context>(), ...options}: Options<Context>,
) {
  router.get(createServerRenderingRequestHandler<Context>(render, options));
  return router;
}

export function createServerRenderingRequestHandler<Context = RequestContext>(
  render: (
    request: EnhancedRequest,
    context: Context,
  ) => ReactElement<any> | Promise<ReactElement<any>>,
  {context, ...options}: Omit<Options<Context>, 'router'> = {},
): RequestHandler<Context> {
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
