import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {
  type BrowserDetails,
  type BrowserBodyAttributes,
  type BrowserHTMLAttributes,
  BrowserDetailsContext,
  BrowserResponseTitle,
  BrowserResponseHeadElements,
  BrowserResponseElementAttributes,
  BrowserResponseSerializations,
} from '@quilted/react-browser/server';

import {EmailContext} from './context.ts';
import {EmailManager} from './manager.ts';

export type Options = ExtractOptions;

export async function renderEmail(
  app: ReactElement<any>,
  {decorate, ...rest}: Options = {},
) {
  const browser = new BrowserEmailResponse();
  const email = new EmailManager();

  const content = await extract(app, {
    decorate(app) {
      return (
        <EmailContext.Provider value={email}>
          <BrowserDetailsContext.Provider value={browser}>
            {decorate?.(app) ?? app}
          </BrowserDetailsContext.Provider>
        </EmailContext.Provider>
      );
    },
    ...rest,
  });

  const {state} = email;

  return {
    ...state,
    html:
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
      renderToStaticMarkup(
        <html {...browser.htmlAttributes.value}>
          <head>
            {browser.title.value && <title>{browser.title.value}</title>}
            {browser.links.value.map((link, index) => (
              <link key={index} {...link} />
            ))}
            {browser.metas.value.map((meta, index) => (
              <meta key={index} {...meta} />
            ))}
          </head>
          <body
            {...browser.bodyAttributes.value}
            dangerouslySetInnerHTML={{__html: content ?? ''}}
          />
        </html>,
      ),
    plainText: state.plainText,
  };
}

class BrowserEmailResponse implements BrowserDetails {
  readonly title = new BrowserResponseTitle();
  readonly metas = new BrowserResponseHeadElements('meta');
  readonly links = new BrowserResponseHeadElements('link');
  readonly bodyAttributes =
    new BrowserResponseElementAttributes<BrowserBodyAttributes>();
  readonly htmlAttributes =
    new BrowserResponseElementAttributes<BrowserHTMLAttributes>();
  readonly serializations = new BrowserResponseSerializations();

  get request(): never {
    throw new Error('Not available in email rendering');
  }

  get cookies(): never {
    throw new Error('Not available in email rendering');
  }
}
