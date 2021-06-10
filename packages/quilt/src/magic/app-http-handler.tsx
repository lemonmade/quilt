// @ts-expect-error This module is created at runtime by the build
import App from '__quilt__/App.tsx';

// @ts-expect-error Same with this one :)
import AssetManifest from '__quilt__/AssetManifest.tsx';

import {createHttpHandler, html} from '@quilted/http-handlers';

import {render, renderApp, Html} from '../server';

const handler = createHttpHandler();

handler.get(async (request) => {
  const {
    html: htmlManager,
    http,
    markup,
    asyncAssets,
  } = await renderApp(<App />, {
    url: request.url,
  });

  const {headers, statusCode = 200} = http.state;

  const usedAssets = asyncAssets.used({timing: 'load'});
  const assetOptions = {userAgent: request.headers.get('User-Agent')};

  const [styles, scripts, preload] = await Promise.all([
    AssetManifest.styles({async: usedAssets, options: assetOptions}),
    AssetManifest.scripts({async: usedAssets, options: assetOptions}),
    AssetManifest.asyncAssets(asyncAssets.used({timing: 'preload'}), {
      options: assetOptions,
    }),
  ]);

  return html(
    render(
      <Html
        manager={htmlManager}
        styles={styles}
        scripts={scripts}
        preloadAssets={preload}
      >
        {markup}
      </Html>,
    ),
    {
      headers: Object.fromEntries([...headers]),
      status: statusCode,
    },
  );
});

export default handler;
