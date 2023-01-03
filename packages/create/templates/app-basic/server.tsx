import '@quilted/quilt/global';
import {
  createRequestRouter,
  createServerRenderingRequestHandler,
} from '@quilted/quilt/server';
import createAssetManifest from '@quilted/quilt/magic/app/asset-manifest';

const router = createRequestRouter();

// For all GET requests, render our React application.
router.get(
  createServerRenderingRequestHandler(
    async () => {
      const {default: App} = await import('./App');
      return <App />;
    },
    {
      assets: createAssetManifest(),
    },
  ),
);

export default router;
