# App server builds

[Server-side rendering](../../server-rendering.md) is a critical part of Quilt. Quilt’s APIs are all designed to work seamlessly on the server and client, but setting up a server that is capable of handling these requests can be complicated. To help make this easier, Quilt can automatically generate the server for you, while still offering plenty of flexibility for more complex use cases.

As noted in the documentation on [browser builds](./browser.md), Quilt doesn’t include a dedicated file that acts as your browser entrypoint; it instead uses your main `App` component as the entry into your application, and builds the browser entry from there. This is the same for the server entrypoint — without you doing anything, Quilt will take your `App` component and wrap it up in server code.

When you run `sewing-kit build` in your workspace, the server build will be placed in the `build/server` directory relative to the root of your application. Without any additional configuration, Quilt produces a small HTTP server using native Node APIs (including ES modules). This server will run on the port specified by the `PORT` environment variable. So, to run the server on port 3000, you could run the following command from the root of your application:

```zsh
PORT=3000 node ./build/server/index.js
```

## Building the server for other environments

The automatic server that Quilt creates uses [Sewing Kit](./TODO) to coordinate its builds. It also makes use of the [request-router](./TODO) library to define the default server. Taken together, these design decisions mean that you can use the same Sewing Kit plugins that adapt a [service using `@quilted/request-router`](./TODO) to a specific deployment platform for the server generated for your app. For example, the [`@quilted/cloudflare` package](../../../packages/cloudflare) provides a `cloudflareWorkers()` Sewing Kit plugin that adapts the automatic server to run perfectly as a [Cloudflare Worker](https://developers.cloudflare.com/workers/):

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp(), cloudflareWorkers());
});
```

## Customizing the server

The default server will listen for all `GET` requests, will perform [server rendering](../../server-rendering.md), and will set the response status, headers, and body accordingly. This default works great for most cases, but just like with Quilt’s [browser builds](./browsers.md), you can completely replace Quilt’s default.

If you want to write a custom server, you can do so by passing the `server` option to the `quiltApp()` Sewing Kit plugin. You can pass the `entry` option to point to a file in your repo that exports a [`@quilted/request-router` `RequestRouter` object](../../../packages/request-router) as the default export:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';

export default createApp((app) => {
  app.use(
    quiltApp({
      // `entry` is like an import — it is relative to this file, and can
      // omit the file extension.
      server: {entry: './server'},
    }),
  );
});
```

You can write any code for your server that you like. Quilt provides some utilities in the `@quilted/quilt/server` entrypoint that lets you reintroduce Quilt’s default rendering logic as part of a larger server. For example, the following custom server does the exact same logic as the normal HTTP server, but adds an additional `ping` route that is handled before the React app:

```tsx
// server.ts

// This is a “magic module in Quilt — it doesn’t actually exist anywhere on
// disk. Quilt creates it at runtime for you. This magic module gives you
// access to a `@quilted/async` `AssetManifest` object that knows how to resolve
// the right assets during server rendering, including the ability to select
// the files with the right browser targets.
import createAssetManifest from '@quilted/quilt/magic/app/asset-manifest';

import {createServerRenderingRequestHandler} from '@quilted/quilt/server';
import {createRequestRouter, response} from '@quilted/quilt/request-router';

import App from './App';

const router = createRequestRouter();

router.get('ping', () => response('pong!'));
router.get(
  createServerRenderingRequestHandler(() => <App />, {
    assets: createAssetManifest(),
  }),
);

export default router;
```

You don’t need to use Quilt’s `request-router` library to create your server if you don’t want to. You can set the `server.kind` option to `'custom'` to disable the automatic request-router builds, and to instead build your custom server entry as a basic JavaScript project. You can use this option if you want to directly author the runtime code for your project, which might be needed for some complex use cases.

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';

export default createApp((app) => {
  app.use(
    quiltApp({
      server: {entry: './server', format: 'custom'},
    }),
  );
});
```

```tsx
// server.tsx

import Koa from 'koa';
import {Html, renderHtml, renderApp} from '@quilted/quilt/server';

import App from './App';

const app = new Koa();

app.use(async (ctx) => {
  const {markup, html, http} = await renderApp(<App />, {
    url: ctx.url,
    headers: ctx.headers,
  });

  const {headers, statusCode = 200} = http.state;

  ctx.status = statusCode;

  for (const [header, value] of headers) {
    ctx.set(header, value);
  }

  ctx.body = renderHtml(<Html manager={html}>{markup}</Html>);
});
```

## Disabling the automatic app server

If you won’t be using the server Quilt builds, you can disable it by passing `server: false` to the `quiltApp()` Sewing Kit plugin:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';

export default createApp((app) => {
  app.use(
    quiltApp({
      server: false,
    }),
  );
});
```

Server-side rendering is an important performance optimization for most applications, and you lose many of the features that make Quilt great by turning it off — things like [async asset preloading](../../async.md), [HTTP bindings](../../http.md), and setting details of the [HTML document](../../html.md). We strongly encourage you to find an approach to deploying your application that makes use of server-side rendering at some point in the future!

## Deeper customizations with Sewing Kit

Quilt exposes a collection of [Sewing Kit hooks](./TODO) for deeply customizing the Quilt app server build:

- `quiltAppServerPort`, which lets you customize the port that the default Node server will listen on.
- `quiltAppServerHost`, which lets you customize the host that the default Node server will listen on.
- `quiltAppServerOutputFormat`, which lets you control the module format that the server output will use (defaults to `module`, which produces native ES modules).
- `quiltAppServerEntryContent`, which lets you customize the magic entry point that Quilt creates to build your server.

Quilt also uses all of the [request-router Sewing Kit hooks](../services.md#deeper-customizations-with-sewing-kit) when your app server uses the request-router library.

When Quilt is building the server version of your app, it sets the `quiltAppServer` option to `true`. You can use the presence of this option to perform tooling customizations that only apply to the server build:

```ts
// sewing-kit.config.ts

import {createApp, quiltApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(quiltApp());
  app.use(
    createProjectPlugin({
      name: 'MyApp.CustomizeBuild',
      build({configure}) {
        configure(({rollupPlugins}, {quiltAppServer}) => {
          if (!quiltAppServer) return;

          rollupPlugins?.(addMyServerOnlyRollupPlugins);
        });
      },
    }),
  );
});
```
