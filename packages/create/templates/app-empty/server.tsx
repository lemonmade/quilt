import {renderAppToHTMLResponse} from '@quilted/quilt/server';
import {RequestRouter} from '@quilted/quilt/request-router';
import {BrowserAssets} from 'quilt:module/assets';

import {App} from './App.tsx';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For all GET requests, render our Preact application.
router.get(async (request) => {
  const response = await renderAppToHTMLResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default router;
