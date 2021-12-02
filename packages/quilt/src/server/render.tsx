import type {ReactElement} from 'react';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {HtmlManager} from '@quilted/react-html/server';
import {HttpManager} from '@quilted/react-http/server';
import {AsyncAssetManager} from '@quilted/react-async/server';

import {ServerContext} from './ServerContext';

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
  const http = new HttpManager({headers});
  const asyncAssets = new AsyncAssetManager();

  const markup = await extract(app, {
    ...rest,
    decorate(app) {
      return (
        <ServerContext
          asyncAssets={asyncAssets}
          http={http}
          html={html}
          url={url}
        >
          {decorate?.(app) ?? app}
        </ServerContext>
      );
    },
  });

  return {markup, http, html, asyncAssets};
}
