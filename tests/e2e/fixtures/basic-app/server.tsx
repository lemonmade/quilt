import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

const router = new RequestRouter();
const assets = createBrowserAssets();

// For all GET requests, render our React application.
router.get(async (request) => {
  const [{App}, {renderToResponse}] = await Promise.all([
    import('./App.tsx'),
    import('@quilted/quilt/server'),
  ]);

  const response = await renderToResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default router;
