import '@quilted/quilt/global';
import {createRequestRouter, createServerRender} from '@quilted/quilt/server';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';
import {createDirectClient} from '@quilted/trpc/server';
import {fetchRequestHandler} from '@trpc/server/adapters/fetch';

import {appRouter} from './trpc.ts';

const router = createRequestRouter();

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
router.get(
  createServerRender(
    async () => {
      const {default: App} = await import('./App.tsx');
      return <App trpc={createDirectClient(appRouter)} />;
    },
    {
      assets: createBrowserAssets(),
    },
  ),
);

export default router;
