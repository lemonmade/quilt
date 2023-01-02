import type {ReactElement} from 'react';

import {extract} from '@quilted/react-server-render/server';
import type {Options as ExtractOptions} from '@quilted/react-server-render/server';
import {HtmlManager} from '@quilted/react-html/server';
import {HttpManager} from '@quilted/react-http/server';
import {AsyncAssetManager} from '@quilted/react-async/server';

import {ServerContext} from './ServerContext';

export interface Options extends ExtractOptions {
  url?: string | URL;
  headers?: NonNullable<
    ConstructorParameters<typeof HttpManager>[0]
  >['headers'];
}

export interface RenderResult {
  readonly http: HttpManager;
  readonly html: HtmlManager;
  readonly markup: string;
  readonly asyncAssets: AsyncAssetManager;
}

export async function renderApp(
  app: ReactElement<any>,
  {decorate, url, headers, ...rest}: Options = {},
): Promise<RenderResult> {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();
  const http = new HttpManager({headers});

  const markup = await extract(app, {
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
    ...rest,
  });

  return {markup, http, html, asyncAssets};
}
