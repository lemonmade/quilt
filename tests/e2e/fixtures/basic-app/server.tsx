import '@quilted/quilt/global';
import {createRequestRouter, createServerRender} from '@quilted/quilt/server';
import {createAssetManifest} from '@quilted/quilt/magic/asset-manifest';

const router = createRequestRouter();

// For all GET requests, render our React application.
router.get(
  createServerRender(
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
