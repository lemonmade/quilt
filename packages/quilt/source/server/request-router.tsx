import {isValidElement, type ReactElement} from 'react';
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
import {
  Head,
  Script,
  ScriptPreload,
  Style,
  StylePreload,
  HTMLManager,
} from '@quilted/react-html/server';
import {extract} from '@quilted/react-server-render/server';

import {HTMLResponse, RedirectResponse} from '@quilted/request-router';

import {ServerContext} from './ServerContext.tsx';

export interface RenderOptions<CacheKey = AssetsCacheKey> {
  readonly request: Request;
  readonly stream?: 'headers' | false;
  readonly assets?: BrowserAssets<CacheKey>;
  readonly cacheKey?: CacheKey;
  waitUntil?(promise: Promise<any>): void;
  renderHTML?(
    content: ReadableStream<string>,
    context: {
      readonly manager: HTMLManager;
      readonly assets?: BrowserAssetsEntry;
      readonly preloadAssets?: BrowserAssetsEntry;
    },
  ): ReadableStream<any> | Promise<ReadableStream<any>>;
}

export async function renderToResponse<CacheKey = AssetsCacheKey>(
  element: ReactElement<any>,
  options: RenderOptions<CacheKey>,
): Promise<HTMLResponse | RedirectResponse>;
export async function renderToResponse<CacheKey = AssetsCacheKey>(
  options: RenderOptions<CacheKey>,
): Promise<HTMLResponse | RedirectResponse>;
export async function renderToResponse<CacheKey = AssetsCacheKey>(
  optionsOrElement: ReactElement<any> | RenderOptions<CacheKey>,
  definitelyOptions?: RenderOptions<CacheKey>,
) {
  let element: ReactElement<any> | undefined;
  let options: RenderOptions<CacheKey>;

  if (isValidElement(optionsOrElement)) {
    element = optionsOrElement;
    options = definitelyOptions!;
  } else {
    options = optionsOrElement as any;
  }

  const {
    request,
    stream: shouldStream = false,
    assets,
    cacheKey: explicitCacheKey,
    waitUntil = noop,
    renderHTML,
  } = options;

  const baseUrl = (request as any).URL ?? new URL(request.url);

  const cacheKey =
    explicitCacheKey ??
    (((await assets?.cacheKey?.(request)) ?? {}) as CacheKey);

  const html = new HTMLManager();
  const http = new HttpManager({headers: request.headers});
  const assetsManager = new AssetsManager<CacheKey>({cacheKey});

  let responseStatus = 200;
  let appHeaders: Headers | undefined;
  let appStream: ReadableStream<any> | undefined;

  if (shouldStream === false && element != null) {
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

    const appTransformStream = new TransformStream();
    const appWriter = appTransformStream.writable.getWriter();
    appStream = appTransformStream.readable;

    appWriter.write(rendered);
    appWriter.close();
  }

  if (appStream == null) {
    const appTransformStream = new TransformStream();
    appStream = appTransformStream.readable;

    const renderAppStream = async function renderAppStream() {
      const appWriter = appTransformStream.writable.getWriter();

      if (element != null) {
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
      }

      appWriter.close();
    };

    waitUntil(renderAppStream());
  }

  const {headers, body} = await renderToHTMLStream(appStream);

  return new HTMLResponse(body, {
    status: responseStatus,
    headers,
  });

  async function renderToHTMLStream(content: ReadableStream<any>) {
    const headers = new Headers(appHeaders);

    const [synchronousAssets, preloadAssets] = await Promise.all([
      assets?.entry({
        cacheKey,
        modules: assetsManager.usedModules({timing: 'load'}),
      }),
      assets?.modules(assetsManager.usedModules({timing: 'preload'}), {
        cacheKey,
      }),
    ]);

    if (synchronousAssets) {
      for (const style of synchronousAssets.styles) {
        headers.append(
          'Link',
          preloadHeader(styleAssetPreloadAttributes(style)),
        );
      }

      for (const script of synchronousAssets.scripts) {
        headers.append(
          'Link',
          preloadHeader(scriptAssetPreloadAttributes(script)),
        );
      }
    }

    if (renderHTML) {
      const body = await renderHTML(content, {
        manager: html,
        assets: synchronousAssets,
        preloadAssets,
      });

      return {headers, body};
    }

    const responseStream = new TextEncoderStream();
    const body = responseStream.readable;

    const renderFullHTML = async function renderFullHTML() {
      const writer = responseStream.writable.getWriter();

      writer.write(`<!DOCTYPE html>`);

      /* eslint-disable jsx-a11y/html-has-lang */

      const {htmlAttributes, bodyAttributes, ...headProps} = html.state;
      const htmlContent = renderToStaticMarkup(
        <html {...htmlAttributes}>
          <head>
            <Head {...headProps} />
            {synchronousAssets?.scripts.map((script) => (
              <Script key={script.source} asset={script} baseUrl={baseUrl} />
            ))}
            {synchronousAssets?.styles.map((style) => (
              <Style key={style.source} asset={style} baseUrl={baseUrl} />
            ))}
            {preloadAssets?.styles.map((style) => (
              <StylePreload
                key={style.source}
                asset={style}
                baseUrl={baseUrl}
              />
            ))}
            {preloadAssets?.scripts.map((script) => (
              <ScriptPreload
                key={script.source}
                asset={script}
                baseUrl={baseUrl}
              />
            ))}
          </head>
          <body
            {...bodyAttributes}
            dangerouslySetInnerHTML={{__html: '%%CONTENT%%'}}
          ></body>
        </html>,
      );

      /* eslint-enable jsx-a11y/html-has-lang */

      const [firstChunk, secondChunk] = htmlContent.split('%%CONTENT%%');
      writer.write(firstChunk);
      if (element != null) writer.write(`<div id="app">`);

      const reader = content.getReader();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          break;
        }

        writer.write(value);
      }

      if (element != null) writer.write(`</div>`);

      const [newSynchronousAssets, newPreloadAssets] = await Promise.all([
        assets?.entry({
          cacheKey,
          modules: assetsManager.usedModules({timing: 'load'}),
        }),
        assets?.modules(assetsManager.usedModules({timing: 'preload'}), {
          cacheKey,
        }),
      ]);

      if (newSynchronousAssets) {
        const diffedSynchronousAssets = diffBrowserAssetsEntries(
          newSynchronousAssets,
          synchronousAssets!,
        );

        const diffedPreloadAssets = diffBrowserAssetsEntries(
          newPreloadAssets!,
          preloadAssets!,
        );

        const additionalAssetsContent = renderToStaticMarkup(
          <>
            {diffedSynchronousAssets.scripts.map((script) => (
              <Script key={script.source} asset={script} baseUrl={baseUrl} />
            ))}
            {diffedSynchronousAssets.styles.map((style) => (
              <Style key={style.source} asset={style} baseUrl={baseUrl} />
            ))}
            {diffedPreloadAssets.styles.map((style) => (
              <StylePreload
                key={style.source}
                asset={style}
                baseUrl={baseUrl}
              />
            ))}
            {diffedPreloadAssets.scripts.map((script) => (
              <ScriptPreload
                key={script.source}
                asset={script}
                baseUrl={baseUrl}
              />
            ))}
          </>,
        );

        writer.write(additionalAssetsContent);
      }

      writer.write(secondChunk);
      writer.close();
    };

    waitUntil(renderFullHTML());

    return {headers, body};
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

function diffBrowserAssetsEntries(
  newList: BrowserAssetsEntry,
  oldList: BrowserAssetsEntry,
): BrowserAssetsEntry {
  const oldStyles = new Set(oldList.styles.map((style) => style.source));
  const oldScripts = new Set(oldList.scripts.map((script) => script.source));

  return {
    styles: newList.styles.filter((style) => !oldStyles.has(style.source)),
    scripts: newList.scripts.filter((script) => !oldScripts.has(script.source)),
  };
}

function noop(..._args: any) {
  // noop
}
