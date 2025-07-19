import type {} from '@quilted/quilt/modules';
import {RequestRouter} from '@quilted/quilt/request-router';

import {BrowserAssets} from 'quilt:module/assets';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For all GET requests, render our Preact application.
router.get(async (request) => {
  const [{default: App}, {renderAppToHTMLResponse}] = await Promise.all([
    import('./App.tsx'),
    import('@quilted/quilt/server'),
  ]);

  assets.entry({id: './inline.css'}).styles;

  const response = await renderAppToHTMLResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default router;
