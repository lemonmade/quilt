// @ts-ignore
import App from '__quilt__/App';
// @ts-ignore
import AssetManifest from '__quilt__/AssetManifest';

import {createHttpHandler, html} from '@quilted/http-handlers';

import {render, renderApp, Html} from '../server';

const handler = createHttpHandler();

handler.get(async (request) => {
  const {html: htmlManager, http, markup, asyncAssets} = await renderApp(
    <App />,
    {
      url: request.url,
    },
  );

  const {headers, statusCode = 200} = http.state;

  const usedAssets = asyncAssets.used({timing: 'immediate'});
  const assetOptions = {userAgent: request.headers.get('User-Agent')};

  const [styles, scripts, preload] = await Promise.all([
    AssetManifest.styles({async: usedAssets, options: assetOptions}),
    AssetManifest.scripts({async: usedAssets, options: assetOptions}),
    AssetManifest.asyncAssets(asyncAssets.used({timing: 'soon'}), {
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
      headers: new Headers([...headers]),
      status: statusCode,
    },
  );
});

export default handler;
