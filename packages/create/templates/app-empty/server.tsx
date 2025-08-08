import {Hono} from 'hono';
import {renderAppToHTMLResponse} from '@quilted/quilt/server';
import {BrowserAssets} from 'quilt:module/assets';

import {App} from './App.tsx';

const app = new Hono();
const assets = new BrowserAssets();

app.get('*', async (c) => {
  const request = c.req.raw;

  const response = await renderAppToHTMLResponse(<App />, {
    request,
    assets,
  });

  return response;
});

export default app;
