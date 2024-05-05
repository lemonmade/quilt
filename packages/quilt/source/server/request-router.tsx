import {isValidElement, type ReactElement} from 'react';
import {
  renderToStaticMarkup,
  renderToStringAsync,
} from 'preact-render-to-string';

import {
  styleAssetPreloadAttributes,
  scriptAssetPreloadAttributes,
  type AssetsCacheKey,
  type BrowserAssets,
  type BrowserAssetsEntry,
} from '@quilted/assets';
import {
  BrowserResponse,
  ScriptAsset,
  ScriptAssetPreload,
  StyleAsset,
  StyleAssetPreload,
} from '@quilted/react-browser/server';

import {HTMLResponse, RedirectResponse} from '@quilted/request-router';

import {ServerContext} from './ServerContext.tsx';

export interface RenderHTMLFunction {
  (
    content: ReadableStream<string>,
    context: {
      readonly response: BrowserResponse;
      readonly assets?: BrowserAssetsEntry;
      readonly preloadAssets?: BrowserAssetsEntry;
    },
  ): ReadableStream<any> | string | Promise<ReadableStream<any> | string>;
}

export interface RenderOptions {
  readonly request: Request;
  readonly status?: number;
  readonly stream?: 'headers' | false;
  readonly headers?: HeadersInit;
  readonly assets?: BrowserAssets;
  readonly cacheKey?: Partial<AssetsCacheKey>;
  readonly serializations?: Iterable<[string, unknown]>;
  readonly renderHTML?: boolean | 'fragment' | 'document' | RenderHTMLFunction;
  waitUntil?(promise: Promise<any>): void;
}

export async function renderToResponse(
  element: ReactElement<any>,
  options: RenderOptions,
): Promise<HTMLResponse | RedirectResponse>;
export async function renderToResponse(
  options: RenderOptions,
): Promise<HTMLResponse | RedirectResponse>;
export async function renderToResponse(
  optionsOrElement: ReactElement<any> | RenderOptions,
  definitelyOptions?: RenderOptions,
) {
  let element: ReactElement<any> | undefined;
  let options: RenderOptions;

  if (isValidElement(optionsOrElement)) {
    element = optionsOrElement;
    options = definitelyOptions!;
  } else {
    options = optionsOrElement as any;
  }

  const {
    request,
    assets,
    status: explicitStatus,
    cacheKey: explicitCacheKey,
    headers: explicitHeaders,
    serializations: explicitSerializations,
    waitUntil = noop,
    stream: shouldStream = false,
    renderHTML = true,
  } = options;

  const baseURL = (request as any).URL ?? new URL(request.url);

  const cacheKey =
    explicitCacheKey ??
    (((await assets?.cacheKey?.(request)) ?? {}) as AssetsCacheKey);

  const browserResponse = new BrowserResponse({
    request,
    cacheKey,
    status: explicitStatus,
    headers: new Headers(explicitHeaders),
    serializations: explicitSerializations,
  });

  let appStream: ReadableStream<any> | undefined;

  if (shouldStream === false && element != null) {
    const rendered = await renderToStringAsync(
      <ServerContext browser={browserResponse}>{element}</ServerContext>,
    );

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
        const rendered = await renderToStringAsync(
          <ServerContext browser={browserResponse}>{element}</ServerContext>,
        );

        appWriter.write(rendered);
      }

      appWriter.close();
    };

    waitUntil(renderAppStream());
  }

  const body = await renderToHTMLBody(appStream);

  return new HTMLResponse(body, {
    status: browserResponse.status.value,
    headers: browserResponse.headers,
  });

  async function renderToHTMLBody(
    content: ReadableStream<any>,
  ): Promise<ReadableStream<any> | string> {
    const [synchronousAssets, preloadAssets] = await Promise.all([
      assets?.entry({
        cacheKey,
        modules: browserResponse.assets.get({timing: 'load'}),
      }),
      assets?.modules(browserResponse.assets.get({timing: 'preload'}), {
        cacheKey,
      }),
    ]);

    if (synchronousAssets) {
      for (const style of synchronousAssets.styles) {
        browserResponse.headers.append(
          'Link',
          preloadHeader(styleAssetPreloadAttributes(style)),
        );
      }

      for (const script of synchronousAssets.scripts) {
        browserResponse.headers.append(
          'Link',
          preloadHeader(scriptAssetPreloadAttributes(script)),
        );
      }
    }

    if (typeof renderHTML === 'function') {
      const body = await renderHTML(content, {
        response: browserResponse,
        assets: synchronousAssets,
        preloadAssets,
      });

      return body;
    } else if (renderHTML === false || renderHTML === 'fragment') {
      return content;
    }

    const responseStream = new TextEncoderStream();
    const body = responseStream.readable;

    const renderFullHTML = async function renderFullHTML() {
      const writer = responseStream.writable.getWriter();

      writer.write(`<!DOCTYPE html>`);

      const htmlContent = renderToStaticMarkup(
        <html {...browserResponse.htmlAttributes.value}>
          <head>
            {browserResponse.title.value && (
              <title>{browserResponse.title.value}</title>
            )}
            {browserResponse.links.value.map((link, index) => (
              <link key={index} {...link} />
            ))}
            {browserResponse.metas.value.map((meta, index) => (
              <meta key={index} {...meta} />
            ))}
            {synchronousAssets?.scripts.map((script) => (
              <ScriptAsset
                key={script.source}
                asset={script}
                baseURL={baseURL}
              />
            ))}
            {synchronousAssets?.styles.map((style) => (
              <StyleAsset key={style.source} asset={style} baseURL={baseURL} />
            ))}
            {preloadAssets?.styles.map((style) => (
              <StyleAssetPreload
                key={style.source}
                asset={style}
                baseURL={baseURL}
              />
            ))}
            {preloadAssets?.scripts.map((script) => (
              <ScriptAssetPreload
                key={script.source}
                asset={script}
                baseURL={baseURL}
              />
            ))}
          </head>
          <body
            {...browserResponse.bodyAttributes.value}
            dangerouslySetInnerHTML={{__html: '%%CONTENT%%'}}
          ></body>
        </html>,
      );

      const [firstChunk, secondChunk] = htmlContent.split('%%CONTENT%%');
      writer.write(firstChunk);
      if (element != null) writer.write(`<div id="app">`);

      const reader = content.getReader();

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
          modules: browserResponse.assets.get({timing: 'load'}),
        }),
        assets?.modules(browserResponse.assets.get({timing: 'preload'}), {
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
              <ScriptAsset
                key={script.source}
                asset={script}
                baseURL={baseURL}
              />
            ))}
            {diffedSynchronousAssets.styles.map((style) => (
              <StyleAsset key={style.source} asset={style} baseURL={baseURL} />
            ))}
            {diffedPreloadAssets.styles.map((style) => (
              <StyleAssetPreload
                key={style.source}
                asset={style}
                baseURL={baseURL}
              />
            ))}
            {diffedPreloadAssets.scripts.map((script) => (
              <ScriptAssetPreload
                key={script.source}
                asset={script}
                baseURL={baseURL}
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

    return body;
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
