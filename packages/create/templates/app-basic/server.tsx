import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {renderToResponse} from '@quilted/quilt/server';
import {Router} from '@quilted/quilt/navigate';
import {BrowserAssets} from 'quilt:module/assets';

import type {AppContext} from '~/shared/context.ts';

import {App} from './App.tsx';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For all GET requests, render our React application.
router.get(async (request) => {
  const context = {
    router: new Router(request.url),
  } satisfies AppContext;

  const response = await renderToResponse(<App context={context} />, {
    request,
    assets,
  });

  return response;
});

export default router;
