import {Hono} from 'hono';
import {BrowserAssets} from 'quilt:module/assets';

const app = new Hono();
const assets = new BrowserAssets();

// For all GET requests, render our Preact application.
app.get('*', async (c) => {
  const request = c.req.raw;

  const [{default: App}, {renderAppToHTMLResponse}] = await Promise.all([
    import('./App.tsx'),
    import('@quilted/quilt/server'),
  ]);

  const response = await renderAppToHTMLResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default app;
