import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {BrowserAssets} from '@quilted/quilt/magic/assets';

import {createDirectClient} from '@quilted/trpc/server';
import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

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
  const [{App}, {renderToResponse}] = await Promise.all([
    import('./App.tsx'),
    import('@quilted/quilt/server'),
  ]);

  const response = await renderToResponse(
    <App trpc={createDirectClient(appRouter)} />,
    {
      request,
      assets,
    },
  );

  return response;
});

export default router;
