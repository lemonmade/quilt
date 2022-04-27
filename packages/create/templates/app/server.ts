import '@quilted/quilt/global';
import {
  createHttpHandler,
  createServerRenderingRequestHandler,
} from '@quilted/quilt/server';
import assets from '@quilted/quilt/magic/asset-loader';

import App from './App';

const httpHandler = createHttpHandler();

// For all GET requests, render our React application.
httpHandler.get(
  createServerRenderingRequestHandler(App, {
    assets,
  }),
);

export default httpHandler;
