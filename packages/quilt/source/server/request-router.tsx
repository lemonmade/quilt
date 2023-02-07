import {Fragment, type ReactElement, type LinkHTMLAttributes} from 'react';

import {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  type AssetsEntry,
  type AssetManifest,
} from '@quilted/async/server';
import {AsyncAssetManager} from '@quilted/react-async/server';
import {HttpManager} from '@quilted/react-http/server';
import {
  renderHtmlToString,
  HtmlManager,
  Html,
} from '@quilted/react-html/server';
import type {
  Options as ExtractOptions,
  ServerRenderRequestContext,
} from '@quilted/react-server-render/server';
import {extract} from '@quilted/react-server-render/server';

import {html, redirect} from '@quilted/request-router';
import type {
  EnhancedRequest,
  RequestHandler,
  RequestContext,
} from '@quilted/request-router';

import {ServerContext} from './ServerContext';

export interface ServerRenderOptions<Context = RequestContext> {
  stream?: 'headers' | false;
  assets?: AssetManifest<unknown>;
  extract?: ExtractOptions;
  context?(
    request: EnhancedRequest,
    context: Context,
  ): ServerRenderRequestContext;
  renderHtml?(
    content: string | undefined,
    request: Request,
    details: Pick<ServerRenderAppDetails, 'http' | 'html'> & {
      readonly assets?: AssetsEntry;
      readonly preloadAssets?: AssetsEntry;
    },
  ): ReactElement<any> | Promise<ReactElement<any>>;
}

export interface ServerRenderAppDetails {
  readonly http: HttpManager;
  readonly html: HtmlManager;
  readonly rendered?: string;
  readonly asyncAssets: AsyncAssetManager;
}

export function createServerRender<Context = RequestContext>(
  getApp:
    | ReactElement<any>
    | ((
        request: EnhancedRequest,
        context: Context,
      ) => ReactElement<any> | Promise<ReactElement<any>>),
  {context, stream, ...options}: ServerRenderOptions<Context> = {},
): RequestHandler<Context> {
  return async (request, requestContext) => {
    const accepts = request.headers.get('Accept');

    if (accepts != null && !accepts.includes('text/html')) return;

    const renderResponse = stream
      ? renderAppToStreamedResponse
      : renderAppToResponse;

    return renderResponse(
      typeof getApp === 'function'
        ? () => getApp(request, requestContext)
        : getApp,
      request,
      {
        ...options,
        extract: {
          ...options.extract,
          context:
            options.extract ??
            context?.(request, requestContext) ??
            (requestContext as any),
        },
      },
    );
  };
}

export async function renderAppToResponse(
  getApp:
    | ReactElement<any>
    | (() => ReactElement<any> | Promise<ReactElement<any>>),
  request: Request,
  {
    assets,
    extract,
    renderHtml,
  }: Pick<ServerRenderOptions, 'assets' | 'renderHtml' | 'extract'> = {},
) {
  const app = typeof getApp === 'function' ? await getApp() : getApp;

  const renderDetails = await serverRenderDetailsForApp(app, {
    extract,
    url: request.url,
    headers: request.headers,
  });

  const {headers, statusCode = 200, redirectUrl} = renderDetails.http.state;

  if (redirectUrl) {
    return redirect(redirectUrl, {
      status: statusCode as 301,
      headers,
    });
  }

  const content = await renderAppDetailsToHtmlString(renderDetails, request, {
    assets,
    renderHtml,
  });

  return html(content, {
    headers,
    status: statusCode,
  });
}

export async function renderAppToStreamedResponse(
  getApp:
    | ReactElement<any>
    | (() => ReactElement<any> | Promise<ReactElement<any>>),
  request: Request,
  {
    assets,
    extract,
    renderHtml,
  }: Pick<ServerRenderOptions, 'assets' | 'renderHtml' | 'extract'> = {},
) {
  const headers = new Headers();
  const stream = new TransformStream();

  const assetContext = {userAgent: request.headers.get('User-Agent')};
  const guaranteedAssets = await assets?.assets({context: assetContext});

  if (guaranteedAssets) {
    for (const style of guaranteedAssets.styles) {
      headers.append('Link', preloadHeader(styleAssetPreloadAttributes(style)));
    }

    for (const script of guaranteedAssets.scripts) {
      headers.append(
        'Link',
        preloadHeader(scriptAssetPreloadAttributes(script)),
      );
    }
  }

  renderResponseToStream();

  return html(stream.readable, {
    headers,
    status: 200,
  });

  async function renderResponseToStream() {
    const app = typeof getApp === 'function' ? await getApp() : getApp;

    const renderDetails = await serverRenderDetailsForApp(app, {
      extract,
      url: request.url,
      headers: request.headers,
    });

    const content = await renderAppDetailsToHtmlString(renderDetails, request, {
      assets,
      renderHtml,
    });

    const encoder = new TextEncoder();
    const writer = stream.writable.getWriter();
    await writer.write(encoder.encode(content));
    await writer.close();
  }
}

async function serverRenderDetailsForApp(
  app: ReactElement<any>,
  {
    url,
    headers,
    extract: extractOptions,
  }: Pick<ServerRenderOptions, 'extract'> & {
    url?: string | URL;
    headers?: NonNullable<
      ConstructorParameters<typeof HttpManager>[0]
    >['headers'];
  } = {},
): Promise<ServerRenderAppDetails> {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();
  const http = new HttpManager({headers});

  const {decorate, ...rest} = extractOptions ?? {};

  const rendered = await extract(app, {
    decorate(app) {
      return (
        <ServerContext
          asyncAssets={asyncAssets}
          http={http}
          html={html}
          url={url}
        >
          {decorate?.(app) ?? app}
        </ServerContext>
      );
    },
    ...rest,
  });

  return {rendered, http, html, asyncAssets};
}

async function renderAppDetailsToHtmlString(
  details: ServerRenderAppDetails,
  request: Request,
  {
    assets,
    renderHtml = defaultRenderHtml,
  }: Pick<ServerRenderOptions, 'assets' | 'renderHtml'> = {},
) {
  const {html: htmlManager, http, rendered, asyncAssets} = details;

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

  return renderHtmlToString(htmlElement);
}

const defaultRenderHtml: NonNullable<ServerRenderOptions<any>['renderHtml']> =
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

function preloadHeader(attributes: LinkHTMLAttributes<HTMLLinkElement>) {
  const {
    as,
    rel = 'preload',
    href,
    crossOrigin,
    crossorigin,
  } = attributes as any;

  // Support both property and attribute versions of the casing
  const finalCrossOrigin = crossOrigin ?? crossorigin;

  let header = `<${href}>; rel="${rel}"; as="${as}"`;

  if (finalCrossOrigin === '' || finalCrossOrigin === true) {
    header += `; crossorigin`;
  } else if (typeof finalCrossOrigin === 'string') {
    header += `; crossorigin="${finalCrossOrigin}"`;
  }

  return header;
}
