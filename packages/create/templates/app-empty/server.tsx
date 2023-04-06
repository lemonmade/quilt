import {createRequestRouter, createServerRender} from '@quilted/quilt/server';
import {createBrowserAssets} from '@quilted/quilt/magic/assets';

const router = createRequestRouter();

// For all GET requests, render our React application.
router.get(
  createServerRender(
    async () => {
      const {default: App} = await import('./App.tsx');
      return <App />;
    },
    {
      assets: createBrowserAssets(),
    },
  ),
);

export default router;
