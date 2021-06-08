import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';
// import {HydrationContext, HydrationManager} from '@shopify/react-hydrate';

import {Script, Style} from '../../../components';
import {HtmlManager} from '../../../manager';
import {HtmlContext} from '../../../context';
import {MANAGED_ATTRIBUTE} from '../../../utilities/update';
import {Serialize} from '../Serialize';

interface Asset {
  path: string;
  integrity?: string;
}

interface Props {
  manager?: HtmlManager;
  // hydrationManager?: HydrationManager;
  children: ReactElement | string;
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
        key={style.path}
        href={style.path}
        integrity={style.integrity}
        crossOrigin="anonymous"
      />
    );
  });

  const blockingScriptsMarkup = blockingScripts?.map((script) => {
    return (
      <Script
        key={script.path}
        src={script.path}
        integrity={script.integrity}
        crossOrigin="anonymous"
      />
    );
  });

  const deferredScriptsMarkup = scripts?.map((script) => {
    return (
      <Script
        key={script.path}
        src={script.path}
        integrity={script.integrity}
        crossOrigin="anonymous"
        defer
      />
    );
  });

  const preloadAssetsMarkup = preloadAssets?.map((asset) => (
    <link
      key={asset.path}
      rel="prefetch"
      href={asset.path}
      as={asset.path.endsWith('.css') ? 'style' : 'script'}
    />
  ));

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  if (process.env.NODE_ENV === 'development') {
    if (bodyAttributes.style == null) {
      bodyAttributes.style = {visibility: 'hidden'};
    } else {
      bodyAttributes.style.visibility = 'hidden';
    }
  }

  return (
    <html lang={locale} {...htmlAttributes}>
      <head>
        {titleMarkup}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="never" />
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
