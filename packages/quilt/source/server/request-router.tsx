import {Fragment, type ReactElement} from 'react';

import {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  type AssetsEntry,
  type AssetManifest,
} from '@quilted/async/server';
import {renderHtmlToString, Html} from '@quilted/react-html/server';
import type {
  Options as ExtractOptions,
  ServerRenderRequestContext,
} from '@quilted/react-server-render/server';

import {html, redirect} from '@quilted/request-router';
import type {
  RequestRouter,
  EnhancedRequest,
  RequestHandler,
  RequestContext,
} from '@quilted/request-router';

import {renderApp, type RenderResult as RenderAppResult} from './render';

export interface Options<Context = RequestContext>
  extends Omit<ExtractOptions, 'context'> {
  assets?: AssetManifest<unknown>;
  router?: RequestRouter<Context>;
  context?(
    request: EnhancedRequest,
    context: Context,
  ): ServerRenderRequestContext;
  renderHtml?(
    content: string | undefined,
    request: Request,
    details: Omit<RenderAppResult, 'asyncAssets' | 'markup'> & {
      readonly assets?: AssetsEntry;
      readonly preloadAssets?: AssetsEntry;
    },
  ): ReactElement<any> | Promise<ReactElement<any>>;
}

export function createServerRender<Context = RequestContext>(
  render: (
    request: EnhancedRequest,
    context: Context,
  ) => ReactElement<any> | Promise<ReactElement<any>>,
  {context, ...options}: Omit<Options<Context>, 'router'> = {},
): RequestHandler<Context> {
  return async (request, requestContext) => {
    const accepts = request.headers.get('Accept');

    if (accepts != null && !accepts.includes('text/html')) return;

    const app = await render(request, requestContext);

    return renderAppToResponse(app, request, {
      ...options,
      context: context?.(request, requestContext) ?? (requestContext as any),
    });
  };
}

export async function renderAppToResponse(
  app: ReactElement<any>,
  request: Request,
  {
    assets,
    renderHtml = defaultRenderHtml,
    ...options
  }: Omit<Options, 'handler' | 'renderProps'> = {},
) {
  const {
    html: htmlManager,
    http,
    rendered,
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
  const assetContext = {userAgent: request.headers.get('User-Agent')};

  const [entryAssets, preloadAssets] = assets
    ? await Promise.all([
        assets.assets({async: usedAssets, context: assetContext}),
        assets.asyncAssets(asyncAssets.used({timing: 'preload'}), {
          context: assetContext,
        }),
      ])
    : [];

  const htmlElement = await renderHtml(rendered, request, {
    html: htmlManager,
    http,
    assets: entryAssets,
    preloadAssets,
  });

  return html(renderHtmlToString(htmlElement), {
    headers,
    status: statusCode,
  });
}

const defaultRenderHtml: NonNullable<Options<any>['renderHtml']> =
  function defaultRenderHtml(content, request, {html, assets, preloadAssets}) {
    const baseUrl = new URL(request.url);

    return (
      <Html
        manager={html}
        headEndContent={
          <>
            {assets &&
              [...assets.styles].map((style) => {
                const attributes = styleAssetAttributes(style, {baseUrl});
                return <link key={style.source} {...attributes} />;
              })}

            {assets &&
              [...assets.scripts].map((script) => {
                const isModule = script.attributes.type === 'module';

                const attributes = scriptAssetAttributes(script, {
                  baseUrl,
                });

                if (isModule) {
                  return (
                    <Fragment key={script.source}>
                      <link {...scriptAssetPreloadAttributes(script)} />
                      <script {...attributes} async />
                    </Fragment>
                  );
                }

                return <script key={script.source} {...attributes} defer />;
              })}

            {preloadAssets &&
              [...preloadAssets.styles].map((style) => {
                const attributes = styleAssetPreloadAttributes(style, {
                  baseUrl,
                });

                return <link key={style.source} {...attributes} />;
              })}

            {preloadAssets &&
              [...preloadAssets.scripts].map((script) => {
                const attributes = scriptAssetPreloadAttributes(script, {
                  baseUrl,
                });

                return <link key={script.source} {...attributes} />;
              })}
          </>
        }
      >
        {content}
      </Html>
    );
  };
