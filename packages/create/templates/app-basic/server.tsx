import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {renderAppToHTMLResponse} from '@quilted/quilt/server';
import {Router} from '@quilted/quilt/navigation';
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

  const response = await renderAppToHTMLResponse(<App context={context} />, {
    request,
    assets,
  });

  return response;
});

export default router;
