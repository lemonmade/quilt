import type {VNode} from 'preact';
import {renderToString, renderToStringAsync} from 'preact-render-to-string';

import {
  preloadScriptAssetHeader,
  preloadStyleAssetHeader,
  type BrowserAssets,
} from '@quilted/assets';
import {BrowserResponse} from '@quilted/browser/server';

import {
  BrowserDetailsContext,
  BrowserAssetsManifestContext,
  BrowserEffectsAreActiveContext,
} from '../context.ts';

import {HTMLTemplate} from './components/HTMLTemplate.tsx';
import {Serialization} from './components/Serialization.tsx';
import {ScriptAssets} from './components/ScriptAssets.tsx';
import {ScriptAssetsPreload} from './components/ScriptAssetsPreload.tsx';
import {StyleAssets} from './components/StyleAssets.tsx';
import {StyleAssetsPreload} from './components/StyleAssetsPreload.tsx';

export type RenderAppValue =
  | string
  | VNode<any>
  | (() => string | VNode<any> | Promise<string | VNode<any>>);

const STREAM_BOUNDARY_ELEMENT_REGEX =
  /<html-template-stream-boundary.+?<\/html-template-stream-boundary>/gim;

const PLACEHOLDER_ELEMENT_REGEX =
  /<html-template-placeholder-(?<name>[\w-]+)/gim;

export async function renderAppToHTMLResponse(
  renderApp: RenderAppValue,
  {
    assets,
    request,
    headers,
    serializations,
    template,
    stream: shouldStream = false,
  }: {
    request: Request;
    assets?: BrowserAssets;
    serializations?: Iterable<[string, unknown]>;
    headers?: HeadersInit;
    template?: string | VNode<any>;
    stream?: boolean;
  },
) {
  const resolvedHeaders = new Headers(headers);

  const browser = new BrowserResponse({
    request,
    serializations,
    headers: resolvedHeaders,
  });

  if (assets) {
    const entryAssets = assets.entry({request: browser.request});

    browser.headers.append(
      'Link',
      [
        ...entryAssets.styles.map((style) => preloadStyleAssetHeader(style)),
        ...entryAssets.scripts.map((script) =>
          preloadScriptAssetHeader(script),
        ),
      ].join(', '),
    );
  }

  const response = await generateResponse(async () => {
    let appContent: string | undefined =
      renderApp == null || shouldStream
        ? undefined
        : await renderAppToString(renderApp, {browser, assets});

    const {firstChunk, remainingChunks} = await renderHTMLTemplateToChunks(
      template ?? <HTMLTemplate />,
      {
        browser,
        assets,
      },
    );

    const renderChunkOptions = {
      browser,
      assets,
      app: async () => {
        appContent ??= await renderAppToString(renderApp!, {browser, assets});
        return appContent;
      },
    };

    const normalizedFirstChunk = shouldStream
      ? firstChunk
      : `${firstChunk}${remainingChunks.join('')}`;

    const renderedFirstChunk = await renderHTMLChunk(
      normalizedFirstChunk,
      renderChunkOptions,
    );

    if (remainingChunks.length === 0 || !shouldStream) {
      return new HTMLResponse(renderedFirstChunk, {
        status: browser.status.value,
        headers: browser.headers,
      });
    }

    const stream = new TextEncoderStream();
    const writer = stream.writable.getWriter();
    writer.write(renderedFirstChunk);

    (async () => {
      try {
        for (const chunk of remainingChunks) {
          const renderedChunk = await renderHTMLChunk(
            chunk,
            renderChunkOptions,
          );
          writer.write(renderedChunk);
        }
      } catch {
        // TODO: handle error
      } finally {
        writer.close();
      }
    })();

    return new HTMLResponse(stream.readable, {
      status: browser.status.value,
      headers: browser.headers,
    });
  });

  return response;
}

export async function renderAppToHTMLString(
  renderApp: RenderAppValue,
  {
    assets,
    request,
    headers,
    serializations,
    template,
  }: {
    request: Request;
    assets?: BrowserAssets;
    headers?: HeadersInit;
    serializations?: Iterable<[string, unknown]>;
    template?: string | VNode<any>;
  },
) {
  const browser = new BrowserResponse({
    request,
    serializations,
    headers: headers ? new Headers(headers) : undefined,
  });

  const appContent = renderApp
    ? await renderAppToString(renderApp, {browser, assets})
    : undefined;

  const {firstChunk, remainingChunks} = await renderHTMLTemplateToChunks(
    template ?? <HTMLTemplate />,
    {
      assets,
      browser,
    },
  );

  const fullContent = `${firstChunk}${remainingChunks.join('')}`;

  const rendered = await renderHTMLChunk(fullContent, {
    browser,
    assets,
    app: appContent,
  });

  return rendered;
}

export async function renderToHTMLString(
  html: string | VNode<any>,
  {
    request,
    assets,
    headers,
    serializations,
  }: {
    request: Request;
    assets?: BrowserAssets;
    headers?: HeadersInit;
    serializations?: Iterable<[string, unknown]>;
  },
) {
  const browser = new BrowserResponse({
    request,
    serializations,
    headers: headers ? new Headers(headers) : undefined,
  });

  const content = await renderHTMLToTemplateString(html, {browser, assets});

  const rendered = await renderHTMLChunk(content, {
    browser,
    assets,
  });

  return rendered;
}

export async function renderToHTMLResponse(
  html: string | VNode<any>,
  {
    request,
    assets,
    headers,
    serializations,
    stream: shouldStream = false,
  }: {
    request: Request;
    assets?: BrowserAssets;
    headers?: HeadersInit;
    serializations?: Iterable<[string, unknown]>;
    stream?: boolean;
  },
) {
  const resolvedHeaders = new Headers(headers);

  const browser = new BrowserResponse({
    request,
    serializations,
    headers: resolvedHeaders,
  });

  if (assets) {
    const entryAssets = assets.entry({request: browser.request});

    resolvedHeaders.append(
      'Link',
      [
        ...entryAssets.styles.map((style) => preloadStyleAssetHeader(style)),
        ...entryAssets.scripts.map((script) =>
          preloadScriptAssetHeader(script),
        ),
      ].join(', '),
    );
  }

  const response = await generateResponse(async () => {
    const content = await renderHTMLToTemplateString(html, {browser, assets});

    const {firstChunk, remainingChunks} = await renderHTMLTemplateToChunks(
      content,
      {
        browser,
        assets,
      },
    );

    const normalizedFirstChunk = shouldStream
      ? firstChunk
      : `${firstChunk}${remainingChunks.join('')}`;

    const renderedFirstChunk = await renderHTMLChunk(normalizedFirstChunk, {
      browser,
      assets,
    });

    if (remainingChunks.length === 0 || !shouldStream) {
      return new HTMLResponse(renderedFirstChunk, {
        status: browser.status.value,
        headers: browser.headers,
      });
    }

    const stream = new TextEncoderStream();
    const writer = stream.writable.getWriter();
    writer.write(renderedFirstChunk);

    (async () => {
      try {
        for (const chunk of remainingChunks) {
          const renderedChunk = await renderHTMLChunk(chunk, {
            browser,
            assets,
          });
          writer.write(renderedChunk);
        }
      } catch {
        // TODO: handle error
      } finally {
        writer.close();
      }
    })();

    return new HTMLResponse(stream.readable, {
      status: browser.status.value,
      headers: browser.headers,
    });
  });

  return response;
}

async function generateResponse(generate: () => Promise<Response>) {
  try {
    const response = await generate();
    return response;
  } catch (error) {
    if (error != null && error instanceof Response) {
      return error;
    }

    throw error;
  }
}

async function renderHTMLToTemplateString(
  html: string | VNode<any>,
  {
    browser,
    assets,
  }: {
    browser?: BrowserResponse;
    assets?: BrowserAssets;
  } = {},
) {
  const rendered =
    typeof html === 'string'
      ? html
      : await renderToStringAsync(
          wrapWithServerContext(html, {assets, browser, effects: false}),
        );

  return normalizeHTMLContent(rendered);
}

async function renderHTMLTemplateToChunks(
  html: string | VNode<any>,
  {
    browser,
    assets,
  }: {
    browser?: BrowserResponse;
    assets?: BrowserAssets;
  } = {},
) {
  let template =
    typeof html === 'string'
      ? html
      : await renderHTMLToTemplateString(html, {browser, assets});

  template = normalizeHTMLContent(template);

  const [firstChunk = '', ...remainingChunks] = template.split(
    STREAM_BOUNDARY_ELEMENT_REGEX,
  );

  return {firstChunk, remainingChunks};
}

async function renderHTMLChunk(
  content: string,
  {
    browser,
    assets,
    app: renderApp,
  }: {
    browser: BrowserResponse;
    assets?: BrowserAssets;
    app?: string | (() => Promise<string>);
  },
) {
  let result = content;
  let match: RegExpExecArray | null;

  const placeholderRegex = new RegExp(PLACEHOLDER_ELEMENT_REGEX, 'mig');

  while ((match = placeholderRegex.exec(result)) != null) {
    if (match.groups && 'name' in match.groups) {
      const {name} = match.groups;
      const startIndex = match.index;
      // Parse any attributes present on the opening placeholder tag
      const attributes = parseAttributesFromIndex(
        result,
        match.index + match[0]!.length,
      );

      const closingTag = `</html-template-placeholder-${name}>`;
      const closingTagIndex = result.indexOf(closingTag, startIndex);

      if (closingTagIndex === -1) continue;

      let replacement = '';

      switch (name) {
        case 'content': {
          if (renderApp == null) {
            throw new Error(
              `Found the content placeholder, but no content was provided while rendering`,
            );
          }

          replacement =
            typeof renderApp === 'string' ? renderApp : await renderApp();

          break;
        }
        case 'serializations': {
          const serializations = browser.serializations.value;

          replacement =
            serializations.length > 0
              ? renderToString(
                  wrapWithServerContext(
                    <>
                      {serializations.map(({name, content}) => (
                        <Serialization name={name} content={content} />
                      ))}
                    </>,
                    {effects: false},
                  ),
                )
              : '';

          break;
        }
        case 'assets': {
          if (assets == null) {
            throw new Error(
              `Found the assets placeholder, but no assets were provided while rendering`,
            );
          }

          const name = attributes.get('name');
          const async = attributes.get('async');
          const preload = attributes.get('preload');

          const includeEntry =
            name != null || (async == null && preload == null);

          const entryAssets = includeEntry
            ? assets.entry({
                id: name,
                request: browser.request,
              })
            : undefined;
          const systemJSAssets =
            includeEntry && (name == null || name === '.')
              ? assets.entry({
                  id: 'system.js',
                  request: browser.request,
                })
              : undefined;

          const asyncAsets =
            async === ''
              ? assets.modules(browser.assets.get({timing: 'load'}), {
                  request: browser.request,
                })
              : undefined;

          const preloadAsets =
            preload === ''
              ? assets.modules(browser.assets.get({timing: 'preload'}), {
                  request: browser.request,
                })
              : undefined;

          replacement = renderToString(
            <>
              {systemJSAssets ? (
                <>
                  <ScriptAssets scripts={systemJSAssets.scripts} />
                </>
              ) : null}
              {entryAssets ? (
                <>
                  <ScriptAssets scripts={entryAssets.scripts} />
                  <StyleAssets styles={entryAssets.styles} />
                </>
              ) : null}
              {asyncAsets ? (
                <>
                  <ScriptAssets scripts={asyncAsets.scripts} />
                  <StyleAssets styles={asyncAsets.styles} />
                </>
              ) : null}
              {preloadAsets ? (
                <>
                  <ScriptAssetsPreload scripts={preloadAsets.scripts} />
                  <StyleAssetsPreload styles={preloadAsets.styles} />
                </>
              ) : null}
            </>,
          );

          break;
        }
        default: {
          throw new Error(
            `Unknown placeholder element: <html-template-placeholder-${name}>`,
          );
        }
      }

      placeholderRegex.lastIndex = startIndex;
      result =
        result.slice(0, startIndex) +
        replacement +
        result.slice(closingTagIndex + closingTag.length);
    }
  }

  return result;
}

async function renderAppToString(
  renderApp: RenderAppValue,
  {browser, assets}: {browser?: BrowserResponse; assets?: BrowserAssets},
) {
  if (typeof renderApp === 'string') return renderApp;

  const renderResult =
    typeof renderApp === 'function' ? await renderApp() : renderApp!;

  if (typeof renderResult === 'string') {
    return renderResult;
  } else {
    return await renderToStringAsync(
      wrapWithServerContext(renderResult, {assets, browser}),
    );
  }
}

function wrapWithServerContext(
  node: VNode<any>,
  {
    browser,
    assets,
    effects,
  }: {browser?: BrowserResponse; assets?: BrowserAssets; effects?: boolean},
) {
  const withBrowser = browser ? (
    <BrowserDetailsContext.Provider value={browser}>
      {node}
    </BrowserDetailsContext.Provider>
  ) : (
    node
  );

  const withAssets = assets ? (
    <BrowserAssetsManifestContext.Provider value={assets}>
      {withBrowser}
    </BrowserAssetsManifestContext.Provider>
  ) : (
    withBrowser
  );

  const withEffects =
    effects == null ? (
      withAssets
    ) : (
      <BrowserEffectsAreActiveContext.Provider value={effects}>
        {withAssets}
      </BrowserEffectsAreActiveContext.Provider>
    );

  return withEffects as VNode<{}>;
}

function normalizeHTMLContent(content: string) {
  return content.startsWith('<!DOCTYPE ') || !content.startsWith('<html')
    ? content
    : `<!DOCTYPE html>${content}`;
}

function parseAttributesFromIndex(
  source: string,
  startIndex: number,
): Map<string, string> {
  const attributes = new Map<string, string>();
  const length = source.length;

  let i = startIndex;

  // Find end of the opening tag while parsing attributes: '>' not inside quotes
  while (i < length) {
    // Skip whitespace
    while (i < length && /\s/.test(source[i]!)) i++;

    if (i >= length) break;

    const char = source[i]!;

    if (char === '>') {
      // End of opening tag
      return attributes;
    }

    // Parse attribute name
    let nameStart = i;
    while (i < length && !/[\s=>]/.test(source[i]!) && source[i] !== '>') {
      i++;
    }

    const name = source.slice(nameStart, i);

    // Skip whitespace
    while (i < length && /\s/.test(source[i]!)) i++;

    let value = '';

    if (source[i] === '=') {
      i++; // skip '='
      // Skip whitespace
      while (i < length && /\s/.test(source[i]!)) i++;

      if (i < length && (source[i] === '"' || source[i] === "'")) {
        const quote = source[i]!;
        i++;
        const valueStart = i;
        while (i < length && source[i] !== quote) i++;
        value = source.slice(valueStart, i);
        if (i < length && source[i] === quote) i++;
      } else {
        const valueStart = i;
        while (i < length && !/[\s>]/.test(source[i]!)) i++;
        value = source.slice(valueStart, i);
      }
    }

    if (name) attributes.set(name, value);
  }

  // If we reached here, we didn't find a '>' — treat end of string as end
  return attributes;
}

const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';

const CONTENT_TYPE_DEFAULT_VALUE_HTML = 'text/html; charset=utf-8';
const CONTENT_TYPE_OPTIONS_DEFAULT_VALUE_HTML = 'nosniff';

export class HTMLResponse extends Response {
  constructor(content: BodyInit | null, options: ResponseInit) {
    const headers = new Headers(options.headers);
    if (!headers.has(CONTENT_TYPE_HEADER)) {
      headers.set(CONTENT_TYPE_HEADER, CONTENT_TYPE_DEFAULT_VALUE_HTML);
    }

    if (!headers.has(CONTENT_TYPE_OPTIONS_HEADER)) {
      headers.set(
        CONTENT_TYPE_OPTIONS_HEADER,
        CONTENT_TYPE_OPTIONS_DEFAULT_VALUE_HTML,
      );
    }

    super(content, {
      ...options,
      headers,
    });
  }
}
