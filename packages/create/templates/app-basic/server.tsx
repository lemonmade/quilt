import '@quilted/quilt/global';
import {
  createRequestRouter,
  createServerRenderingRequestHandler,
} from '@quilted/quilt/server';
import createAssetManifest from '@quilted/quilt/magic/app/asset-manifest';

import App from './App';

const router = createRequestRouter();

// For all GET requests, render our React application.
router.get(
  createServerRenderingRequestHandler(() => <App />, {
    assets: createAssetManifest(),
  }),
);

export default router;
