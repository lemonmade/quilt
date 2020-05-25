import React, {ReactElement} from 'react';

import {HtmlManager, HtmlContext} from '@quilted/react-html/server';
import {
  AsyncAssetContext,
  AsyncAssetManager,
} from '@quilted/react-async/server';
import {extract, Options} from '@quilted/react-server-render/server';

export async function render(
  app: ReactElement<any>,
  {decorate, ...rest}: Options = {},
) {
  const html = new HtmlManager();
  const asyncAssets = new AsyncAssetManager();

  const markup = await extract(app, {
    // eslint-disable-next-line react/function-component-definition
    decorate(app) {
      return (
        <AsyncAssetContext.Provider value={asyncAssets}>
          <HtmlContext.Provider value={html}>
            {decorate?.(app) ?? app}
          </HtmlContext.Provider>
        </AsyncAssetContext.Provider>
      );
    },
    ...rest,
  });

  return {markup, html, asyncAssets};
}
