import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';
// import {HydrationContext, HydrationManager} from '@shopify/react-hydrate';

import {Script, Style} from '../../../components';
import {HtmlManager} from '../../../manager';
import {HtmlContext} from '../../../context';
import {MANAGED_ATTRIBUTE} from '../../../utilities/update';
import {Serialize} from '../Serialize';

interface Asset {
  source: string;
  attributes: Record<string, string | boolean | number>;
}

interface Props {
  manager?: HtmlManager;
  // hydrationManager?: HydrationManager;
  children: ReactElement | string;
  noModule?: boolean;
  locale?: string;
  styles?: Asset[];
  scripts?: Asset[];
  blockingScripts?: Asset[];
  preloadAssets?: Asset[];
  headMarkup?: ReactNode;
  bodyMarkup?: ReactNode;
}

export function Html({
  manager,
  children,
  noModule = true,
  locale,
  styles,
  scripts,
  blockingScripts,
  preloadAssets,
  headMarkup,
  bodyMarkup,
}: Props) {
  const markup =
    typeof children === 'string'
      ? children
      : render(children, {htmlManager: manager});

  const extracted = manager && manager.extract();

  const serializationMarkup = extracted?.serializations.map(({id, data}) => (
    <Serialize key={id} id={id} data={data} />
  ));

  const managedProps = {[MANAGED_ATTRIBUTE]: true};

  const titleMarkup = extracted?.title ? (
    <title {...managedProps}>{extracted.title}</title>
  ) : null;

  const metaMarkup = extracted?.metas.map((metaProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <meta key={index} {...managedProps} {...metaProps} />
  ));

  const linkMarkup = extracted?.links.map((linkProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <link key={index} {...managedProps} {...linkProps} />
  ));

  const stylesMarkup = styles?.map((style) => {
    return (
      <Style
        key={style.source}
        href={style.source}
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

  const blockingScriptsMarkup = blockingScripts?.map((script) => {
    return (
      <Script
        key={script.source}
        src={script.source}
        crossOrigin=""
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        {...script.attributes}
      />
    );
  });

  const deferredScriptsMarkup = scripts?.map((script) => {
    return (
      <Script
        key={script.source}
        src={script.source}
        crossOrigin=""
        defer
        noModule={
          !needsNoModule || script.attributes.type === 'module'
            ? undefined
            : true
        }
        {...script.attributes}
      />
    );
  });

  const preloadAssetsMarkup = preloadAssets?.map((asset) => (
    <link
      key={asset.source}
      rel={asset.attributes.type === 'module' ? 'moduleprefetch' : 'prefetch'}
      href={asset.source}
      crossOrigin=""
      as={asset.source.endsWith('.css') ? 'style' : 'script'}
    />
  ));

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  return (
    <html lang={locale} {...htmlAttributes}>
      <head>
        {titleMarkup}
        <meta charSet="utf-8" />
        {metaMarkup}
        {linkMarkup}

        {stylesMarkup}
        {headMarkup}
        {blockingScriptsMarkup}
        {deferredScriptsMarkup}
        {preloadAssetsMarkup}
      </head>

      <body {...bodyAttributes}>
        <div id="app" dangerouslySetInnerHTML={{__html: markup}} />

        {bodyMarkup}
        {serializationMarkup}
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
