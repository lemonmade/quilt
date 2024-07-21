import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {BrowserAssets} from 'quilt:module/assets';

import {createDirectClient} from '@quilted/trpc/server';
import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

import type {AppContext} from '~/shared/context.ts';

import {appRouter} from './trpc.ts';

const router = new RequestRouter();
const assets = new BrowserAssets();

router.any(
  'api',
  (request) => {
    return fetchRequestHandler({
      endpoint: '/api',
      req: request,
      router: appRouter,
      createContext: () => ({}),
    });
  },
  {exact: false},
);

// For all GET requests, render our React application.
router.get(async (request) => {
  const [{App}, {renderToResponse}, {Router}, {QueryClient}] =
    await Promise.all([
      import('./App.tsx'),
      import('@quilted/quilt/server'),
      import('@quilted/quilt/navigation'),
      import('@tanstack/react-query'),
    ]);

  const context = {
    router: new Router(request.url),
    trpc: createDirectClient(appRouter),
    queryClient: new QueryClient(),
  } satisfies AppContext;

  const response = await renderToResponse(<App context={context} />, {
    request,
    assets,
  });

  return response;
});

export default router;
