/* eslint react/no-unknown-property: off */

import type {ReactElement, ReactNode} from 'react';
import {renderToString} from 'react-dom/server';

import {HtmlManager} from '../../manager.ts';
import {HtmlContext} from '../../context.ts';
import {Serialize} from './Serialize.tsx';

export interface HtmlProps {
  manager?: HtmlManager;
  locale?: string;
  headStartContent?: ReactNode;
  headEndContent?: ReactNode;
  bodyStartContent?: ReactNode;
  children?: ReactElement | string;
  bodyEndContent?: ReactNode;
  rootElement?: boolean | {id?: string};
}

export function Html({
  manager,
  locale,
  headStartContent,
  headEndContent,
  bodyStartContent,
  children,
  bodyEndContent,
  rootElement,
}: HtmlProps) {
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

  const scriptContent = extracted?.scripts.map((scriptProps, index) => (
    // Fine for server rendering
    // eslint-disable-next-line react/no-array-index-key
    <script key={index} {...scriptProps} />
  ));

  const htmlAttributes = extracted?.htmlAttributes ?? {};
  const bodyAttributes = extracted?.bodyAttributes ?? {};

  const resolvedRootElement: {id: string} | false =
    rootElement === false
      ? false
      : {
          id: 'app',
          ...(typeof rootElement === 'object' ? rootElement : undefined),
        };

  if (resolvedRootElement === false && content) {
    bodyAttributes.dangerouslySetInnerHTML = {__html: content};
  }

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

        {scriptContent}

        {headEndContent}
      </head>

      <body {...bodyAttributes}>
        {bodyStartContent}

        {resolvedRootElement ? (
          <div
            id={resolvedRootElement.id}
            dangerouslySetInnerHTML={{__html: content ?? ''}}
          />
        ) : null}

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
