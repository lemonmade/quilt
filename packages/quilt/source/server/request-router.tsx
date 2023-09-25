import {type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import {
  styleAssetPreloadAttributes,
  scriptAssetPreloadAttributes,
  type AssetsCacheKey,
  type BrowserAssets,
  type BrowserAssetsEntry,
} from '@quilted/assets';
import {AssetsManager} from '@quilted/react-assets/server';
import {HttpManager} from '@quilted/react-http/server';
import {Head, HtmlManager} from '@quilted/react-html/server';
import {extract} from '@quilted/react-server-render/server';

import {HTMLResponse, RedirectResponse} from '@quilted/request-router';

import {ServerContext} from './ServerContext.tsx';

export async function renderToResponse<CacheKey = AssetsCacheKey>(
  element: ReactElement<any>,
  {
    request,
    stream: shouldStream = false,
    assets,
    cacheKey: explicitCacheKey,
    waitUntil = noop,
    renderHtml,
  }: {
    readonly request: Request;
    readonly stream?: 'headers' | false;
    readonly assets?: BrowserAssets<CacheKey>;
    readonly cacheKey?: CacheKey;
    waitUntil?(promise: Promise<any>): void;
    renderHtml?(
      content: ReadableStream<string>,
      context: {
        readonly manager: HtmlManager;
        readonly assets?: BrowserAssetsEntry;
        readonly preloadAssets?: BrowserAssetsEntry;
      },
    ): ReadableStream<any> | Promise<ReadableStream<any>>;
  },
) {
  const baseUrl = (request as any).URL ?? new URL(request.url);

  const cacheKey =
    explicitCacheKey ??
    (((await assets?.cacheKey?.(request)) ?? {}) as CacheKey);
  const synchronousAssets: BrowserAssetsEntry | undefined = await assets?.entry(
    {cacheKey},
  );
  let preloadAssets: BrowserAssetsEntry | undefined;
  let asyncAssets: BrowserAssetsEntry | undefined;

  const html = new HtmlManager();
  const http = new HttpManager({headers: request.headers});
  const assetsManager = new AssetsManager<CacheKey>({cacheKey});

  let responseStatus = 200;
  let appHeaders: Headers | undefined;
  let appStream: ReadableStream<any> | undefined;

  if (shouldStream === false) {
    const rendered = await extract(element, {
      decorate(element) {
        return (
          <ServerContext
            http={http}
            html={html}
            url={baseUrl}
            assets={assetsManager}
          >
            {element}
          </ServerContext>
        );
      },
    });

    const {headers, statusCode = 200, redirectUrl} = http.state;

    if (redirectUrl) {
      return new RedirectResponse(redirectUrl, {
        status: statusCode as 301,
        headers,
        request,
      });
    }

    appHeaders = headers;
    responseStatus = statusCode;

    const [] = await Promise.all([
      assets?.modules(assetsManager.usedModules({timing: 'load'})),
      assets?.modules(assetsManager.usedModules({timing: 'preload'})),
    ]);

    const appTransformStream = new TransformStream();
    const appWriter = appTransformStream.writable.getWriter();
    appStream = appTransformStream.readable;

    appWriter.write(rendered);
    appWriter.close();
  }

  const responseHeaders = new Headers(appHeaders);

  if (synchronousAssets) {
    for (const style of synchronousAssets.styles) {
      responseHeaders.append(
        'Link',
        preloadHeader(styleAssetPreloadAttributes(style)),
      );
    }

    for (const script of synchronousAssets.scripts) {
      responseHeaders.append(
        'Link',
        preloadHeader(scriptAssetPreloadAttributes(script)),
      );
    }
  }

  if (appStream == null) {
    const appTransformStream = new TransformStream();
    appStream = appTransformStream.readable;

    const renderAppStream = async function renderAppStream() {
      const appWriter = appTransformStream.writable.getWriter();

      const rendered = await extract(element, {
        decorate(element) {
          return (
            <ServerContext
              http={http}
              html={html}
              url={baseUrl}
              assets={assetsManager}
            >
              {element}
            </ServerContext>
          );
        },
      });

      appWriter.write(rendered);
      appWriter.close();
    };

    waitUntil(renderAppStream());
  }

  const responseBody = await renderToHtmlStream(appStream);

  return new HTMLResponse(responseBody, {
    status: responseStatus,
    headers: responseHeaders,
  });

  async function renderToHtmlStream(content: ReadableStream<any>) {
    if (renderHtml) {
      return await renderHtml(content, {
        manager: html,
        assets: synchronousAssets,
        preloadAssets,
      });
    }

    const responseStream = new TextEncoderStream();

    const renderFullHtml = async function renderFullHtml() {
      const writer = responseStream.writable.getWriter();

      writer.write(`<!DOCTYPE html>`);

      const {htmlAttributes, bodyAttributes} = html.state;
      const htmlContent = renderToStaticMarkup(
        // eslint-disable-next-line jsx-a11y/html-has-lang
        <html {...htmlAttributes}>
          <head>
            <Head html={html} />
          </head>
          <body {...bodyAttributes}>
            <div id="app" dangerouslySetInnerHTML={{__html: '{{APP}}'}}></div>
          </body>
        </html>,
      );

      const [firstChunk, secondChunk] = htmlContent.split('{{APP}}');
      writer.write(firstChunk);

      const reader = content.getReader();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          break;
        }

        writer.write(value);
      }

      writer.write(secondChunk);
      writer.close();
    };

    waitUntil(renderFullHtml());

    return responseStream.readable;
  }
}

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

function noop(..._args: any) {
  // noop
}
