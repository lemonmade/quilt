import '@quilted/quilt/global';
import {
  createHttpHandler,
  createServerRenderingRequestHandler,
} from '@quilted/quilt/server';
import createAssetManifest from '@quilted/quilt/magic/app/asset-manifest';

import App from './App';

const httpHandler = createHttpHandler();

// For all GET requests, render our React application.
httpHandler.get(
  createServerRenderingRequestHandler(() => <App />, {
    assets: createAssetManifest(),
  }),
);

export default httpHandler;
