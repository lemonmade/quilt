import {Fragment, type ReactElement} from 'react';

import {
  styleAssetAttributes,
  styleAssetPreloadAttributes,
  scriptAssetAttributes,
  scriptAssetPreloadAttributes,
  type AssetsCacheKey,
  type BrowserAssets,
  type BrowserAssetsEntry,
} from '@quilted/assets';
import {AssetsManager} from '@quilted/react-assets/server';
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

import {ServerContext} from './ServerContext.tsx';

export interface ServerRenderOptions<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
> {
  stream?: 'headers' | false;
  assets?: BrowserAssets<CacheKey>;
  extract?: Omit<ExtractOptions, 'context'> & {
    readonly context?:
      | ServerRenderRequestContext
      | ((
          request: EnhancedRequest,
          context: Context,
        ) => ServerRenderRequestContext);
  };
  renderHtml?(
    content: string | undefined,
    details: Pick<ServerRenderAppDetails, 'http' | 'html'> & {
      readonly request: EnhancedRequest;
      readonly context: Context;
      readonly assets?: BrowserAssetsEntry;
      readonly preloadAssets?: BrowserAssetsEntry;
    },
  ): ReactElement<any> | Promise<ReactElement<any>>;
}

export interface ServerRenderAppDetails<
  _Context = RequestContext,
  CacheKey = AssetsCacheKey,
> {
  readonly http: HttpManager;
  readonly html: HtmlManager;
  readonly assets: AssetsManager<CacheKey>;
  readonly rendered?: string;
}

export function createServerRender<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  getApp:
    | ReactElement<any>
    | ((
        request: EnhancedRequest,
        context: Context,
      ) => ReactElement<any> | Promise<ReactElement<any>>),
  {stream, ...options}: ServerRenderOptions<Context, CacheKey> = {},
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
      {
        ...options,
        request,
        context: requestContext,
        extract: {
          ...options.extract,
          context:
            typeof options.extract?.context === 'function'
              ? options.extract.context(request, requestContext)
              : options.extract?.context,
        },
      },
    );
  };
}

export async function renderAppToResponse<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  getApp:
    | ReactElement<any>
    | (() => ReactElement<any> | Promise<ReactElement<any>>),
  {
    request,
    context,
    assets,
    extract,
    renderHtml,
  }: Pick<
    ServerRenderOptions<Context, CacheKey>,
    'assets' | 'renderHtml' | 'extract'
  > & {readonly request: EnhancedRequest; readonly context: Context},
) {
  const app = typeof getApp === 'function' ? await getApp() : getApp;
  const cacheKey = (await assets?.cacheKey?.(request)) as CacheKey;

  const renderDetails = await serverRenderDetailsForApp(app, {
    extract,
    cacheKey,
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

  const content = await renderAppDetailsToHtmlString<Context, CacheKey>(
    renderDetails,
    {
      request,
      context,
      assets,
      renderHtml,
    },
  );

  return html(content, {
    headers,
    status: statusCode,
  });
}

export async function renderAppToStreamedResponse<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  getApp:
    | ReactElement<any>
    | (() => ReactElement<any> | Promise<ReactElement<any>>),
  {
    request,
    context,
    assets,
    extract,
    renderHtml,
  }: Pick<
    ServerRenderOptions<Context, CacheKey>,
    'assets' | 'renderHtml' | 'extract'
  > & {readonly request: EnhancedRequest; readonly context: Context},
) {
  const headers = new Headers();
  const stream = new TransformStream();

  const cacheKey = (await assets?.cacheKey?.(request)) as CacheKey;
  const guaranteedAssets = await assets?.entry({cacheKey});

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
      cacheKey,
      url: request.url,
      headers: request.headers,
    });

    const content = await renderAppDetailsToHtmlString<Context, CacheKey>(
      renderDetails,
      {
        request,
        context,
        assets,
        renderHtml,
      },
    );

    const encoder = new TextEncoder();
    const writer = stream.writable.getWriter();
    await writer.write(encoder.encode(content));
    await writer.close();
  }
}

async function serverRenderDetailsForApp<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  app: ReactElement<any>,
  {
    url,
    headers,
    cacheKey,
    extract: extractOptions,
  }: Pick<ServerRenderOptions, 'extract'> & {
    url?: string | URL;
    cacheKey?: CacheKey;
    headers?: NonNullable<
      ConstructorParameters<typeof HttpManager>[0]
    >['headers'];
  } = {},
): Promise<ServerRenderAppDetails<Context, CacheKey>> {
  const html = new HtmlManager();
  const http = new HttpManager({headers});
  const assets = new AssetsManager<CacheKey>({cacheKey});

  const {decorate, ...rest} = extractOptions ?? {};

  const rendered = await extract(app, {
    decorate(app) {
      return (
        <ServerContext http={http} html={html} url={url} assets={assets}>
          {decorate?.(app) ?? app}
        </ServerContext>
      );
    },
    ...rest,
  });

  return {rendered, http, html, assets};
}

async function renderAppDetailsToHtmlString<
  Context = RequestContext,
  CacheKey = AssetsCacheKey,
>(
  details: ServerRenderAppDetails<Context, CacheKey>,
  {
    request,
    context,
    assets,
    renderHtml = defaultRenderHtml,
  }: Pick<ServerRenderOptions<Context, CacheKey>, 'assets' | 'renderHtml'> & {
    readonly request: EnhancedRequest;
    readonly context: Context;
    readonly cacheKey?: Partial<CacheKey>;
  },
) {
  const {http, rendered, html: htmlManager, assets: assetsManager} = details;

  const cacheKey = assetsManager.cacheKey as CacheKey;
  const usedModules = assetsManager.usedModules({timing: 'load'});

  const [entryAssets, preloadAssets] = assets
    ? await Promise.all([
        assets.entry({modules: usedModules, cacheKey}),
        assets.modules(assetsManager.usedModules({timing: 'preload'}), {
          cacheKey,
        }),
      ])
    : [];

  const htmlElement = await renderHtml(rendered, {
    request,
    context,
    html: htmlManager,
    http,
    assets: entryAssets,
    preloadAssets,
  });

  return renderHtmlToString(htmlElement);
}

const defaultRenderHtml: NonNullable<ServerRenderOptions<any>['renderHtml']> =
  function defaultRenderHtml(content, {request, html, assets, preloadAssets}) {
    const baseUrl = new URL(request.url);

    return (
      <Html
        manager={html}
        headEndContent={
          <>
            {assets &&
              assets.styles.map((style) => {
                const attributes = styleAssetAttributes(style, {baseUrl});
                return <link key={style.source} {...(attributes as any)} />;
              })}

            {assets &&
              assets.scripts.map((script) => {
                const isModule = script.attributes?.type === 'module';

                const attributes = scriptAssetAttributes(script, {
                  baseUrl,
                });

                if (isModule) {
                  return (
                    <Fragment key={script.source}>
                      <link
                        {...(scriptAssetPreloadAttributes(script) as any)}
                      />
                      <script {...(attributes as any)} async />
                    </Fragment>
                  );
                }

                return (
                  <script key={script.source} {...(attributes as any)} defer />
                );
              })}

            {preloadAssets &&
              preloadAssets.styles.map((style) => {
                const attributes = styleAssetPreloadAttributes(style, {
                  baseUrl,
                });

                return <link key={style.source} {...(attributes as any)} />;
              })}

            {preloadAssets &&
              preloadAssets.scripts.map((script) => {
                const attributes = scriptAssetPreloadAttributes(script, {
                  baseUrl,
                });

                return <link key={script.source} {...(attributes as any)} />;
              })}
          </>
        }
      >
        {content}
      </Html>
    );
  };

function preloadHeader(attributes: Partial<HTMLLinkElement>) {
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
