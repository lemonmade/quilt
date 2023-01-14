/* eslint react/no-unknown-property: off */

import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';

import {HtmlManager} from '../../../manager';
import {HtmlContext} from '../../../context';
import {Serialize} from '../Serialize';

interface Asset {
  source: string;
  attributes: Record<string, string | boolean | number>;
}

interface Props {
  url?: URL;
  manager?: HtmlManager;
  children?: ReactElement | string;
  noModule?: boolean;
  locale?: string;
  styles?: readonly Asset[];
  scripts?: readonly Asset[];
  blockingScripts?: readonly Asset[];
  preloadAssets?: readonly Asset[];
  headContent?: ReactNode;
  bodyContent?: ReactNode;
}

export function Html({
  url,
  manager,
  children,
  noModule = true,
  locale,
  styles,
  scripts,
  blockingScripts,
  preloadAssets,
  headContent,
  bodyContent,
}: Props) {
  const content =
    children == null || typeof children !== 'object'
      ? children
      : render(children, {htmlManager: manager});

  const getAssetDetails =
    url == null
      ? (source: string) => ({source, crossorigin: false})
      : (source: string) => ({
          source: source.startsWith(url.origin)
            ? source.slice(url.origin.length)
            : source,
          crossorigin: true,
        });

  const extracted = manager?.extract();

  const serializationContent = extracted?.serializations.map(({id, data}) => (
    <Serialize key={id} id={id} data={data} />
  ));

  const titleContent = extracted?.title ? (
    <title>{extracted.title}</title>
  ) : null;

  const metaContent = extracted?.metas.map((metaProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <meta key={index} {...metaProps} />
  ));

  const linkContent = extracted?.links.map((linkProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <link key={index} {...linkProps} />
  ));

  const stylesContent = styles?.map((style) => {
    const {source, crossorigin} = getAssetDetails(style.source);

    return (
      <link
        rel="stylesheet"
        type="text/css"
        key={source}
        href={source}
        // @ts-expect-error This gets rendered directly as HTML
        crossorigin={crossorigin ? '' : undefined}
        {...style.attributes}
      />
    );
  });

  const needsNoModule =
    noModule &&
    (blockingScripts?.some((script) => script.attributes.type === 'module') ||
      scripts?.some((script) => script.attributes.type === 'module') ||
      false);

  const blockingScriptsContent = blockingScripts?.map((script) => {
    const {source, crossorigin} = getAssetDetails(script.source);

    return (
      <script
        key={script.source}
        src={source}
        type="text/javascript"
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        // @ts-expect-error This gets rendered directly as HTML
        crossorigin={crossorigin ? '' : undefined}
        {...script.attributes}
      />
    );
  });

  const deferredScriptsContent = scripts?.map((script) => {
    const {source, crossorigin} = getAssetDetails(script.source);

    return (
      <script
        key={source}
        src={source}
        type="text/javascript"
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        defer={script.attributes.type === 'module' ? undefined : true}
        // @ts-expect-error This gets rendered directly as HTML
        crossorigin={crossorigin ? '' : undefined}
        {...script.attributes}
      />
    );
  });

  const preloadAssetsContent = preloadAssets?.map((asset) => {
    const {source, crossorigin} = getAssetDetails(asset.source);

    return (
      <link
        key={source}
        rel={asset.attributes.type === 'module' ? 'moduleprefetch' : 'prefetch'}
        href={source}
        // @ts-expect-error This gets rendered directly as HTML
        crossorigin={crossorigin ? '' : undefined}
        as={asset.source.endsWith('.css') ? 'style' : 'script'}
      />
    );
  });

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  return (
    <html lang={locale} {...htmlAttributes}>
      <head>
        {titleContent}

        {/* @ts-expect-error This gets rendered directly as HTML */}
        <meta charset="utf-8" />
        {metaContent}

        {linkContent}
        {preloadAssetsContent}

        {stylesContent}

        {headContent}
        {serializationContent}

        {blockingScriptsContent}
        {deferredScriptsContent}
      </head>

      <body {...bodyAttributes}>
        <div id="app" dangerouslySetInnerHTML={{__html: content ?? ''}} />

        {bodyContent}
      </body>
    </html>
  );
}

function render(
  app: ReactElement<any>,
  {
    htmlManager,
  }: {
    htmlManager?: HtmlManager;
    // hydrationManager?: HydrationManager;
  },
) {
  // const hydrationWrapped = hydrationManager ? (
  //   <HydrationContext.Provider value={hydrationManager}>
  //     {app}
  //   </HydrationContext.Provider>
  // ) : (
  //   app
  // );

  const content =
    htmlManager == null ? (
      app
    ) : (
      <HtmlContext.Provider value={htmlManager}>{app}</HtmlContext.Provider>
    );

  return renderToString(content);
}
