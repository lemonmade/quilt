import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {renderToResponse} from '@quilted/quilt/server';
import {BrowserAssets} from 'quilt:module/assets';

import {App} from './App.tsx';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For all GET requests, render our React application.
router.get(async (request) => {
  const response = await renderToResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default router;
