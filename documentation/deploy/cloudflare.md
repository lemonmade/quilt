# Deploying to Cloudflare

[Cloudflare](https://www.cloudflare.com) provides a couple different hosting options that are supported by Quilt:

- [Deploying applications on Cloudflare Pages](#cloudflare-pages), which works great for both [server-side rendering](#deploying-a-server-rendered-app-to-cloudflare-pages) (using a [custom Worker](https://developers.cloudflare.com/pages/platform/functions/advanced-mode/)) and [static site generation](#deploying-a-static-rendered-app-to-cloudflare-pages). Cloudflare Pages also takes care of serving your static assets, and has handy [previews deployments for Git branches](https://developers.cloudflare.com/pages/platform/branch-build-controls/)
- [Deploying applications and services to Cloudflare Workers](#deploying-to-cloudflare-workers), which lets you deploy backend custom backend code to Cloudflare’s edge network.

## Before you get started

Quilt comes with a dedicated Cloudflare package, [`@quilted/cloudflare` package](../../integrations/cloudflare/), that will configure your applications and services to run on Cloudflare’s infrastructure. Install it as a dev dependency, either at the root of your workspace or in one individual project:

```bash
pnpm install @quilted/cloudflare --save-dev
# or
npm install @quilted/cloudflare --save-dev
# or
yarn add @quilted/cloudflare --dev
```

You’ll use this package later, both in your [Quilt configuration file](../craft.md), and in any runtime code that needs to know about Cloudflare-specific details.

## Cloudflare Pages

[Cloudflare Pages](https://pages.cloudflare.com) lets you build static and dynamic sites hosted on Cloudflare’s CDN. You typically deploy your application entirely by using git, and Cloudflare generates preview versions of your site for each branch you create. Cloudflare Pages is a great match for Quilt’s [server-side rendering](../features/server-rendering.md) and [static rendering](../features/static-rendering.md) capabilities.

This guide assumes you have already [created an app with Quilt](../getting-started.md#creating-an-app). In that app’s `quilt.project.ts` file, use the `cloudflarePages()` plugin from `@quilted/cloudflare/craft` to configure your application to run on Cloudflare Pages:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflarePages} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(quiltApp(), cloudflarePages());
});
```

Quilt will default to assuming your assets are served from `/assets/` relative to the domain of your application, and the Cloudflare Pages plugin will use this path as the prefix to check for when serving your browser assets. If you want to use a different path, you can do so by passing a custom `assets.baseUrl` option to the `quiltApp` plugin:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflarePages} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltApp({
      // This **must** be an absolute path when using Cloudflare Pages
      assets: {baseUrl: '/public/assets/'},
    }),
  );
  project.use(cloudflarePages());
});
```

### Deploying a server–rendered app to Cloudflare Pages

The default Quilt apps are configuration for Cloudflare Pages happens on the Cloudflare dashboard. The [Cloudflare Pages getting started](https://developers.cloudflare.com/pages/getting-started) is a great place to learn more, but the basic flow is this:

- Log in to (or sign up for) the [Cloudflare Pages dashboard](https://pages.dev/). As part of this process, you will also need to connect your Github account.
- Create a new Cloudflare Pages project, and connect to the Github repo that has your Quilt application in it.
- Configure your Cloudflare Pages project as detailed below.

Quilt projects generally use the following values for the **Build settings** section of the Cloudflare Pages configuration:

<dl>
  <dt>Framework preset:</dt>
  <dl>None</dl>

  <dt>Build command:</dt>
  <dl>npm run build</dl>

  <dt>Build output directory:</dt>
  <dl>build/public</dl>
</dl>

> **Note:** If you are using `pnpm` or `yarn`, replace the build command above with `pnpm run build` or `yarn run build`. Cloudflare Pages should automatically detect your package manager and install your dependencies before building your app.

When you’re ready, save your project. And that’s pretty much it! Cloudflare will pull down the code on your main branch, build your application, and upload the static site and assets to its CDN. In the Cloudflare dashboard, you’ll be able to see the automatically-created URL for the project, and a variety of actions you can take on the project (including the ability to assign a custom domain).

For more details, you can read the [Cloudflare Pages](https://developers.cloudflare.com/pages/) documentation. Have fun!

### Deploying a static–rendered app to Cloudflare Pages

Before you start, make sure that your application is configured to be statically rendered. This rendering mode is [disabled by default](../features/static-rendering.md). Enabling it is pretty easy, though. Find your app’s Quilt configuration file (usually `./quilt.project.ts` in a simple project, or `app/quilt.project.ts` in a monorepo), and set `static: true` in the `quiltApp` plugin options:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflarePages} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltApp({
      static: true,
    }),
    cloudflarePages(),
  );
});
```

When setting `static: true`, Quilt’s [automatic server-rendering](../features/server-rendering.md) becomes disabled by default. If you want to have both the static build and the server-rendering builds at the same time, you’ll need to explicitly enable both.

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflarePages} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltApp({
      server: true,
      static: true,
    }),
    cloudflarePages(),
  );
});
```

Make sure to commit and push these changes to your project.

The rest of the configuration for Cloudflare Pages happens on the Cloudflare dashboard. The [Cloudflare Pages getting started](https://developers.cloudflare.com/pages/getting-started) is a great place to learn more, but the basic flow is this:

- Log in to (or sign up for) the [Cloudflare Pages dashboard](https://pages.dev/). As part of this process, you will also need to connect your Github account.
- Create a new Cloudflare Pages project, and connect to the Github repo that has your Quilt application in it.
- Configure your Cloudflare Pages project as detailed below.

Quilt projects generally use the following values for the **Build settings** section of the Cloudflare Pages configuration:

<dl>
  <dt>Framework preset:</dt>
  <dl>None</dl>

  <dt>Build command:</dt>
  <dl>npm run build</dl>

  <dt>Build output directory:</dt>
  <dl>build/public</dl>
</dl>

> **Note:** If you are using `pnpm` or `yarn`, replace the build command above with `pnpm run build` or `yarn run build`. Cloudflare Pages should automatically detect your package manager and install your dependencies before building your app.

When you’re ready, save your project. And that’s pretty much it! Cloudflare will pull down the code on your main branch, build your application, and upload the static site and assets to its CDN. In the Cloudflare dashboard, you’ll be able to see the automatically-created URL for the project, and a variety of actions you can take on the project (including the ability to assign a custom domain).

For more details, you can read the [Cloudflare Pages](https://developers.cloudflare.com/pages/) documentation. Have fun!

## Deploying to Cloudflare Workers

Quilt and [Craft](../craft.md) make it easy to deploy your apps and backend services as [Cloudflare Workers](https://workers.cloudflare.com). The small, modern JavaScript bundles Quilt creates are a great fit for Cloudflare’s quick startup times and global distribution.

This guide assumes you have already [created an app or service with Quilt](../getting-started.md).

### Step 1: Configure your project to run as a Cloudflare Worker

In your project’s `quilt.project.ts` file, use the `cloudflareWorkers()` plugin from `@quilted/cloudflare/craft` to configure your application to run on Cloudflare Workers:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(quiltApp(), cloudflareWorkers());
});
```

This plugin will make sure your server build output is compatible with Cloudflare Workers’ lightweight JavaScript environment.

Quilt apps and services default to using [`@quilted/request-router` for writing backend code](../features/request-routing.md). This library is small, so it works well in Cloudflare Workers. However, you can use Quilt just to do the build of your app or service, and use [Cloudflare’s native module-based APIs](https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-module-worker). You might want to do this if your worker doesn’t need the routing utilities provided by `@quilted/request-router`, or you want to make use of non-HTTP APIs available in Cloudflare, like [scheduled events](https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/) or [Cloudflare Queues](https://developers.cloudflare.com/queues/javascript-apis/#consumer).

In your application code, you can write your Cloudflare Worker using its default export convention:

```ts
export default {
  async fetch(request, env) {
    if (request.url === '/ping') {
      await env.MY_QUEUE.send({ping: true});
      return new Response('pong', {status: 200});
    }

    return new Response('Not found', {status: 404});
  },
  queue(batch) {
    console.log(batch);
  },
};
```

You will also need to tell Quilt that you do not use `@quilted/request-router`. For an application, you do this by setting the `server.format` option of `quiltApp()` to `'custom'`:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltApp({
      server: {format: 'custom'},
    }),
    cloudflareWorkers(),
  );
});
```

For a service, you do this by setting the `format` option of `quiltService()` to `'custom'`:

```ts
// functions/my-worker/quilt.project.ts

import {createProject, quiltService} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(
    quiltService({
      format: 'custom',
    }),
    cloudflareWorkers(),
  );
});
```

#### Step 2: Configure Wrangler to upload your Worker

Cloudflare provides [Wrangler](https://github.com/cloudflare/wrangler) as a command line tool for deploying your project to Cloudflare Workers. You’ll need to install it, which you will typically do as a development dependency at the root of your workspace:

```bash
pnpm install wrangler --save-dev
# or
npm install wrangler --save-dev
# or
yarn add wrangler --dev
```

You’ll also need a configuration file to teach Cloudflare how to deploy your project. You can do this manually, or you can run the `wrangler init` command to have Cloudflare’s CLI do it for you:

```bash
pnpm run wrangler init my-project-name
# or
npm run wrangler init my-project-name
# or
yarn run wrangler init my-project-name
```

If this command asks you if you would like to create a Worker file, you can select “None” — Quilt will generate your worker based on the source code of your project.

After running the command above, a `wrangler.toml` will exist at the root of your repo. For complex workspaces with multiple workers, we recommend you nest this `wrangler.toml` file in the subdirectory of your repo that contains your project.

In your new `wrangler.toml` file, you will need to change the [`main` field](https://developers.cloudflare.com/workers/wrangler/configuration/#inheritable-keys) to point to Quilt’s build outputs. Where Quilt outputs its built files depends on the type of project and the nesting of your workspace. In a typical app, you will need to update your `wrangler.toml` to include the following content:

```toml
# ./app/wrangler.toml

# You will need to make sure this is the relative path from your
# `wrangler.toml` to your service’s build outputs.
main = "./build/server/server.js"
```

In a typical service, you will need to update your `wrangler.toml` to include the following content:

```toml
# ./functions/my-function/wrangler.toml

# You will need to make sure this is the relative path from your
# `wrangler.toml` to your service’s build outputs.
main = "./build/runtime/runtime.js"
```

With this configuration, you’re already ready to run `wrangler publish` to deploy your application:

```bash
pnpm run wrangler publish --config ./path/to/wrangler.toml
# or
npm run wrangler publish --config ./path/to/wrangler.toml
# or
yarn run wrangler publish --config ./path/to/wrangler.toml
```

That’s it! Your project should now be live on Cloudflare. Follow the links in the console to see your code in production.
