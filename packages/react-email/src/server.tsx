import type {ReactElement} from 'react';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {
  HtmlManager,
  HtmlContext,
  Html,
  render,
} from '@quilted/react-html/server';

import {EmailContext} from './context';
import {EmailManager} from './manager';

export interface Options extends ExtractOptions {}

export async function renderEmail(
  app: ReactElement<any>,
  {decorate, ...rest}: Options = {},
) {
  const html = new HtmlManager();
  const email = new EmailManager();

  const markup = await extract(app, {
    // eslint-disable-next-line react/function-component-definition
    decorate(app) {
      return (
        <EmailContext.Provider value={email}>
          <HtmlContext.Provider value={html}>
            {decorate?.(app) ?? app}
          </HtmlContext.Provider>
        </EmailContext.Provider>
      );
    },
    ...rest,
  });

  const {state} = email;

  return {
    ...state,
    html: render(<Html manager={html}>{markup}</Html>, {
      doctype:
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
    }),
    plainText: state.plainText,
  };
}
