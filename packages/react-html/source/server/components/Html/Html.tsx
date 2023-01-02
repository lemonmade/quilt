import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';
// import {HydrationContext, HydrationManager} from '@shopify/react-hydrate';

import {HtmlManager} from '../../../manager';
import {HtmlContext} from '../../../context';
import {MANAGED_ATTRIBUTE} from '../../../utilities/update';
import {Serialize} from '../Serialize';

interface Asset {
  source: string;
  attributes: Record<string, string | boolean | number>;
}

interface Props {
  url?: URL;
  manager?: HtmlManager;
  children: ReactElement | string;
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
    typeof children === 'string'
      ? children
      : render(children, {htmlManager: manager});

  const normalizeSource =
    url == null
      ? (source: string) => source
      : (source: string) =>
          source.startsWith(url.origin)
            ? source.slice(url.origin.length)
            : source;

  const extracted = manager?.extract();

  const serializationContent = extracted?.serializations.map(({id, data}) => (
    <Serialize key={id} id={id} data={data} />
  ));

  const managedProps = {[MANAGED_ATTRIBUTE]: true};

  const titleContentcontent = extracted?.title ? (
    <title {...managedProps}>{extracted.title}</title>
  ) : null;

  const metaContentcontent = extracted?.metas.map((metaProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <meta key={index} {...managedProps} {...metaProps} />
  ));

  const linkContentcontent = extracted?.links.map((linkProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <link key={index} {...managedProps} {...linkProps} />
  ));

  const stylesContentcontent = styles?.map((style) => {
    return (
      <link
        rel="stylesheet"
        type="text/css"
        key={style.source}
        href={normalizeSource(style.source)}
        crossOrigin=""
        {...style.attributes}
      />
    );
  });

  const needsNoModule =
    noModule &&
    (blockingScripts?.some((script) => script.attributes.type === 'module') ||
      scripts?.some((script) => script.attributes.type === 'module') ||
      false);

  const blockingScriptsContentcontent = blockingScripts?.map((script) => {
    return (
      <script
        key={script.source}
        src={normalizeSource(script.source)}
        crossOrigin=""
        type="text/javascript"
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        {...script.attributes}
      />
    );
  });

  const deferredScriptsContentcontent = scripts?.map((script) => {
    return (
      <script
        key={script.source}
        src={normalizeSource(script.source)}
        crossOrigin=""
        defer
        type="text/javascript"
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        {...script.attributes}
      />
    );
  });

  const preloadAssetsContentcontent = preloadAssets?.map((asset) => (
    <link
      key={asset.source}
      rel={asset.attributes.type === 'module' ? 'moduleprefetch' : 'prefetch'}
      href={normalizeSource(asset.source)}
      crossOrigin=""
      as={asset.source.endsWith('.css') ? 'style' : 'script'}
    />
  ));

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  return (
    <html lang={locale} {...htmlAttributes}>
      <head>
        {titleContentcontent}

        <meta charSet="utf-8" />
        {metaContentcontent}

        {linkContentcontent}
        {preloadAssetsContentcontent}

        {stylesContentcontent}

        {headContent}
        {serializationContent}

        {blockingScriptsContentcontent}
        {deferredScriptsContentcontent}
      </head>

      <body {...bodyAttributes}>
        <div id="app" dangerouslySetInnerHTML={{__html: content}} />

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
