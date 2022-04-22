import {
  createHttpHandler,
  createServerRenderingRequestHandler,
} from '@quilted/quilt/server';
import assets from '@quilted/quilt/magic/asset-loader';

import App from './App';

const httpHandler = createHttpHandler();
const requestHandler = createServerRenderingRequestHandler(App, {
  assets,
});

// For all GET requests, render our React application.
httpHandler.get(requestHandler);

export default httpHandler;
