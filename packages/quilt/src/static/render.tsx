import type {ReactElement} from 'react';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {HtmlManager} from '@quilted/react-html/server';
import {HttpManager} from '@quilted/react-http/server';
import {AsyncAssetManager} from '@quilted/react-async/server';

import {StaticContext} from './StaticContext';

interface Options extends ExtractOptions {
  url?: string | URL;
  headers?: NonNullable<
    ConstructorParameters<typeof HttpManager>[0]
  >['headers'];
}

export async function renderApp(
  app: ReactElement<any>,
  {decorate, url, headers, ...rest}: Options = {},
) {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();
  const http = new HttpManager({headers});

  const markup = await extract(app, {
    decorate(app) {
      return (
        <StaticContext asyncAssets={asyncAssets} html={html} url={url}>
          {decorate?.(app) ?? app}
        </StaticContext>
      );
    },
    ...rest,
  });

  return {markup, http, html, asyncAssets};
}
