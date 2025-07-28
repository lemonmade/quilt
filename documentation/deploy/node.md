# Deploying to Node.js

## Deploying a server-rendered app

Quilt’s [app template](../projects/apps/README.md) is configured to deploy to Node.js by default. When you run your `build` command, Rollup will build your application into a Node project, with the main entry file of `build/server/server.js`. You can run this file with a `PORT` to start your server:

```sh
pnpm --filter ./app run build
PORT=3000 node ./app/build/server/server.js
```

However, the default template does not include static asset serving, since assets can be served in many different ways (including from a CDN, separate from your application server). If you want to serve your assets from your application server, you must add the following code to your `server.tsx` source file:

```ts
// server.tsx

import {Hono} from 'hono';
import {serveStaticAppAssets} from '@quilted/quilt/hono/node';
import {BrowserAssets} from 'quilt:module/assets';

const app = new Hono();

if (process.env.NODE_ENV === 'production') {
  app.all('/assets/*', serveStaticAppAssets(import.meta.url));
}

// ... rest of server

export default app;
```

If you have configured a custom output firectory with the `assets.directory` option to Quilt’s `quiltApp()` Rollup plugin, you’ll need to update the `root` option to the path of your assets directory. Similarly, if you have configured a custom base URL with the `assets.baseUrl` option, you’ll need to update the path pattern (the first argument to `app.use()`) your assets directory to match.
