import {isValidElement, type VNode} from 'preact';
import {
  renderToStaticMarkup,
  renderToStringAsync,
} from 'preact-render-to-string';

import {
  styleAssetPreloadAttributes,
  scriptAssetPreloadAttributes,
  type BrowserAssets,
  type BrowserAssetsEntry,
} from '@quilted/assets';
import {
  Title,
  Link,
  Meta,
  Serialization,
  BrowserResponse,
  ScriptAsset,
  ScriptAssetPreload,
  StyleAsset,
  StyleAssetPreload,
  BrowserEffectsAreActiveContext,
} from '@quilted/preact-browser/server';

import {HTMLResponse, EnhancedResponse} from '@quilted/request-router';

import {ServerContext} from './ServerContext.tsx';

export interface RenderHTMLFunction {
  (
    content: ReadableStream<string>,
    context: {
      readonly response: BrowserResponse;
    },
  ): ReadableStream<any> | string | Promise<ReadableStream<any> | string>;
}

export interface RenderToResponseOptions {
  readonly request: Request;
  readonly status?: number;
  readonly stream?: 'headers' | false;
  readonly headers?: HeadersInit;
  readonly assets?: BrowserAssets;
  readonly serializations?: Iterable<[string, unknown]>;
  readonly renderHTML?: boolean | 'fragment' | 'document' | RenderHTMLFunction;
  waitUntil?(promise: Promise<any>): void;
}

export async function renderToResponse(
  element: VNode<any>,
  options: RenderToResponseOptions,
): Promise<EnhancedResponse>;
export async function renderToResponse(
  options: RenderToResponseOptions,
): Promise<EnhancedResponse>;
export async function renderToResponse(
  optionsOrElement: VNode<any> | RenderToResponseOptions,
  definitelyOptions?: RenderToResponseOptions,
): Promise<EnhancedResponse> {
  let element: VNode<any> | undefined;
  let options: RenderToResponseOptions;

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
    headers: explicitHeaders,
    serializations: explicitSerializations,
    waitUntil = noop,
    stream: shouldStream = false,
    renderHTML = true,
  } = options;

  const baseURL = (request as any).URL ?? new URL(request.url);

  const browserResponse = new BrowserResponse({
    request,
    status: explicitStatus,
    headers: new Headers(explicitHeaders),
    serializations: explicitSerializations,
  });

  let appStream: ReadableStream<any> | undefined;

  if (shouldStream === false && element != null) {
    let rendered: string;

    try {
      rendered = await renderToStringAsync(
        <ServerContext assets={assets} browser={browserResponse}>
          {element}
        </ServerContext>,
      );
    } catch (error) {
      if (error instanceof Response) {
        const mergedHeaders = new Headers(browserResponse.headers);

        // Copy headers from error response, potentially overwriting existing ones
        for (const [key, value] of error.headers) {
          if (key.toLowerCase() === 'set-cookie') continue;
          mergedHeaders.set(key, value);
        }

        for (const setCookie of error.headers.getSetCookie()) {
          mergedHeaders.append('Set-Cookie', setCookie);
        }

        const mergedResponse = new EnhancedResponse(error.body, {
          status: Math.max(browserResponse.status.value, error.status),
          headers: mergedHeaders,
        });

        return mergedResponse;
      }

      throw error;
    }

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
        // TODO: how could we handle redirects automatically? For now, if people want
        // this, they will explicitly turn on streaming and will have to use some in-app
        // to manually handle redirects (e.g., by rendering a script tag that uses JavaScript
        // to redirect)
        const rendered = await renderToStringAsync(
          <ServerContext assets={assets} browser={browserResponse}>
            {element}
          </ServerContext>,
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
    if (typeof renderHTML === 'function') {
      const body = await renderHTML(content, {
        response: browserResponse,
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

      const synchronousAssets = assets?.entry({
        request,
        modules: browserResponse.assets.get({timing: 'load'}),
      });
      const preloadAssets = assets?.modules(
        browserResponse.assets.get({timing: 'preload'}),
        {
          request,
        },
      );

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

      const htmlContent = renderToStaticMarkup(
        <BrowserEffectsAreActiveContext.Provider value={false}>
          <html {...browserResponse.htmlAttributes.value}>
            <head>
              <Title>{browserResponse.title.value}</Title>
              {browserResponse.links.value.map((link) => (
                <Link {...link} />
              ))}
              {browserResponse.metas.value.map((meta) => (
                <Meta {...meta} />
              ))}
              {browserResponse.serializations.value.map(({name, content}) => (
                <Serialization name={name} content={content} />
              ))}
              {synchronousAssets?.scripts.map((script) => (
                <ScriptAsset
                  key={script.source}
                  asset={script}
                  baseURL={baseURL}
                />
              ))}
              {synchronousAssets?.styles.map((style) => (
                <StyleAsset
                  key={style.source}
                  asset={style}
                  baseURL={baseURL}
                />
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
          </html>
        </BrowserEffectsAreActiveContext.Provider>,
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

      const newSynchronousAssets = assets?.entry({
        request,
        modules: browserResponse.assets.get({timing: 'load'}),
      });

      const newPreloadAssets = assets?.modules(
        browserResponse.assets.get({timing: 'preload'}),
        {
          request,
        },
      );

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
