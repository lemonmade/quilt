import React from 'react';
import type {ReactElement} from 'react';

import {
  extract,
  Options as ExtractOptions,
} from '@quilted/react-server-render/server';
import {HtmlManager} from '@quilted/react-html/server';
import {AsyncAssetManager} from '@quilted/react-async/server';

import {ServerContext} from './ServerContext';

interface Options extends ExtractOptions {
  url?: string | URL;
}

export async function render(
  app: ReactElement<any>,
  {decorate, url, ...rest}: Options = {},
) {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();

  const markup = await extract(app, {
    // eslint-disable-next-line react/function-component-definition
    decorate(app) {
      return (
        <ServerContext asyncAssets={asyncAssets} html={html} url={url}>
          {decorate?.(app) ?? app}
        </ServerContext>
      );
    },
    ...rest,
  });

  return {markup, html, asyncAssets};
}
