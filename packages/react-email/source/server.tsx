import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {Head, HTMLManager, HTMLContext} from '@quilted/react-html/server';

import {EmailContext} from './context.ts';
import {EmailManager} from './manager.ts';

export type Options = ExtractOptions;

export async function renderEmail(
  app: ReactElement<any>,
  {decorate, ...rest}: Options = {},
) {
  const html = new HTMLManager();
  const email = new EmailManager();

  const content = await extract(app, {
    decorate(app) {
      return (
        <EmailContext.Provider value={email}>
          <HTMLContext.Provider value={html}>
            {decorate?.(app) ?? app}
          </HTMLContext.Provider>
        </EmailContext.Provider>
      );
    },
    ...rest,
  });

  const {state} = email;

  const {htmlAttributes, bodyAttributes, ...headProps} = html.state;

  return {
    ...state,
    html:
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
      renderToStaticMarkup(
        // eslint-disable-next-line jsx-a11y/html-has-lang
        <html {...htmlAttributes}>
          <head>
            <Head {...headProps} />
          </head>
          <body
            {...bodyAttributes}
            dangerouslySetInnerHTML={{__html: content ?? ''}}
          />
        </html>,
      ),
    plainText: state.plainText,
  };
}
