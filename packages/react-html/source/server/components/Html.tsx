/* eslint react/no-unknown-property: off */

import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';

import {HtmlManager} from '../../manager.ts';
import {HtmlContext} from '../../context.ts';
import {Serialize} from './Serialize.tsx';

interface Props {
  manager?: HtmlManager;
  locale?: string;
  headStartContent?: ReactNode;
  headEndContent?: ReactNode;
  bodyStartContent?: ReactNode;
  children?: ReactElement | string;
  bodyEndContent?: ReactNode;
}

export function Html({
  manager,
  locale,
  headStartContent,
  headEndContent,
  bodyStartContent,
  children,
  bodyEndContent,
}: Props) {
  const content =
    children == null || typeof children !== 'object'
      ? children
      : renderContent(children, {htmlManager: manager});

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

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  return (
    <html lang={locale} {...htmlAttributes}>
      <head>
        {headStartContent}

        {titleContent}

        {linkContent}

        {/* @ts-expect-error This gets rendered directly as HTML */}
        <meta charset="utf-8" />
        {metaContent}
        {serializationContent}

        {headEndContent}
      </head>

      <body {...bodyAttributes}>
        {bodyStartContent}

        <div id="app" dangerouslySetInnerHTML={{__html: content ?? ''}} />

        {bodyEndContent}
      </body>
    </html>
  );
}

function renderContent(
  app: ReactElement<any>,
  {
    htmlManager,
  }: {
    htmlManager?: HtmlManager;
  },
) {
  const content =
    htmlManager == null ? (
      app
    ) : (
      <HtmlContext.Provider value={htmlManager}>{app}</HtmlContext.Provider>
    );

  return renderToString(content);
}
