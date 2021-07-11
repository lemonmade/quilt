# Deploying to Cloudflare

[Cloudflare](https://www.cloudflare.com) provides a couple different hosting options that are supported by Quilt:

- [Deploying applications as a static site on Cloudflare Pages](#cloudflare-pages), which is great for smaller projects that don’t need server-side rendering or access to Cloudflare’s backend APIs
- [Deploying applications and backend services to Cloudflare Workers](#cloudflare-workers), which lets you build APIs or server-rendered application rendered on Cloudflare’s edge network

## Cloudflare Pages

[Cloudflare Pages](https://pages.cloudflare.com) lets you build static sites hosted on Cloudflare’s CDN. You typically deploy your application entirely by using git, and Cloudflare generates preview versions of your site for each branch you create. Cloudflare Pages is a great match for Quilt’s [static rendering capabilities](../static-rendering.md).

This guide assumes you have already [created an app or service with Quilt and Sewing Kit](./TODO). If you don’t already have a Quilt project, you can create one from the [static site template repo](https://github.com/quilt-framework/quilt-template-static-site).

### Getting Started

Before you start, make sure that your application is configured to be statically rendered. If you cloned the [template repo](https://github.com/quilt-framework/quilt-template-static-site), this is already done, but if not, be aware that this rendering mode is [disabled by default](../static-rendering.md). Enabling it is pretty easy, though. Find your app’s Sewing Kit configuration file (usually `app/sewing-kit.config.ts` or just `sewing-kit.config.ts`), and set `static: true` in the `quiltApp` plugin options:

```ts
// app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      static: true,
    }),
  );
});
```

When setting `static: true`, Quilt’s [automatic server-rendering](../server-rendering.md) becomes disabled by default. If you want to have both the static build and the server-rendering builds at the same time, you’ll need to explicitly enable both.

```ts
// app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.index('./app');
  app.use(
    quiltApp({
      server: true,
      static: true,
    }),
  );
});
```

Make sure to commit and push these changes to your project.

### Configuration your Cloudflare Pages project

The rest of the configuration for Cloudflare Pages happens on the Cloudflare dashboard. The [Cloudflare Pages getting started](https://developers.cloudflare.com/pages/getting-started) is a great place to learn more, but the basic flow is this:

- Log in to (or sign up for) the [Cloudflare Pages dashboard](https://pages.dev/). As part of this process, you will also need to connect your Github account.
- Create a new Cloudflare Pages project, and connect to the Github repo that has your Quilt application in it.
- Configure your Cloudflare Pages project as detailed below.

Quilt projects generally use the following values for the **Build settings** section of the Cloudflare Pages configuration:

**Framework preset:** None
**Build command:** yarn build
**Build output directory:** build/public

When you’re ready, save your project. And that’s pretty much it! Cloudflare will pull down the code on your main branch, build your application, and upload the static site and assets to its CDN. In the Cloudflare dashboard, you’ll be able to see the automatically-created URL for the project, and a variety of actions you can take on the project (including the ability to assign a custom domain).

For more details, you can read the [Cloudflare Pages](https://developers.cloudflare.com/pages/) documentation. Have fun!

## Cloudflare Workers

Quilt and [Sewing Kit](./TODO) make it easy to deploy your apps and backend services as [Cloudflare Workers](https://workers.cloudflare.com). The small, modern JavaScript bundles Quilt creates are a great fit for Cloudflare’s quick startup times and global distribution.

This guide assumes you have already [created an app or service with Quilt and Sewing Kit](./TODO). If you don’t already have a Quilt project and would prefer to create your project with Cloudflare’s tools, you can skip this guide and use the [Wrangler CLI](https://github.com/cloudflare/wrangler) to generate one of the Quilt templates instead:

- **Basic app** ([template repo](https://github.com/quilt-framework/quilt-template-cloudflare-workers), [live site](https://quilt-template-cloudflare-workers.lemons.workers.dev/)): a web application with server side rendering (using [Cloudflare Workers](https://developers.cloudflare.com/workers/)) and asset hosting (using [Worker Sites](https://developers.cloudflare.com/workers/platform/sites)).

  You can deploy this template to Cloudflare with a single command using [Wrangler](https://github.com/cloudflare/wrangler):

  ```zsh
  wrangler generate my-app https://github.com/quilt-framework/quilt-template-cloudflare-workers
  ```

  Or, mash your finger/ mouse on this handy button:

  [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/quilt-framework/quilt-template-cloudflare-workers)

- **Basic monorepo** ([template repo](https://github.com/quilt-framework/quilt-template-cloudflare-workers-monorepo)): a monorepo that includes a server-side rendering application and a backend service, both deployed as [Cloudflare Workers](https://developers.cloudflare.com/workers/). Cloudflare doesn’t support generating a project from this repo, so you’ll need to generate a new repo from this template on Github and clone it locally.

### Getting started

To configure your builds to target Cloudflare, you’ll first need to install the `@quilted/cloudflare` package, which contains all the necessary build configuration:

```zsh
yarn add @quilted/cloudflare --dev
```

If you are working on a monorepo and have many projects with their own `package.json`s, you can install `@quilted/cloudflare` as a `devDependency` for the entire workspace, or you can install it as a `devDependency` for each individual project — the choice is yours.

### Deploying an app

You can deploy the server created by Quilt’s [automatic server-side rendering feature](./TODO) as a Cloudflare Worker. That server also supports [Cloudflare Sites](https://developers.cloudflare.com/workers/platform/sites), which can serve the static assets Quilt creates for the browser.

#### Step 1: Add the Cloudflare Sewing Kit plugin

Import the Cloudflare plugin to your app’s `sewing-kit.config.ts` file. The new plugin can go anywhere in your configuration, but we generally recommend putting the plugin later in your configuration, so the build setup it adds overwrites settings provided by other plugins.

```ts
// In an app’s Sewing Kit configuration, like app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp());
  app.use(cloudflareWorkers());
});
```

By default, Quilt produces Cloudflare Workers in the newer [modules format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#modules), which current requires a paid Cloudflare plan. If you want to deploy to a free Cloudflare account, you will need to update the Cloudflare Sewing Kit plugin to change the output format to [service-worker](https://developers.cloudflare.com/workers/cli-wrangler/configuration#service-workers):

```ts
import {createApp, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp());
  app.use(cloudflareWorkers({format: 'service-worker'}));
});
```

Quilt will default to assuming your assets are served from `/assets/` relative to the domain of your application, and the Cloudflare plugin will use this path as the prefix to check for when serving your browser assets. If you want to use a different path, you can do so by passing a custom `assets.baseUrl` option to the `quiltApp` Sewing Kit plugin:

```ts
import {createApp, quiltApp} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(
    quiltApp({
      // This **must** be an absolute path when using Cloudflare Workers
      // if you want your browser assets to be served by the autogenerated
      // Cloudflare Worker.
      assets: {baseUrl: '/public/assets/'},
    }),
  );
  app.use(cloudflareWorkers());
});
```

If you want to disable the automatic serving of your browser assets (you might want to do this if you are uploading your browser assets to a separate CDN), you can do so by passing `serveAssets: false` to the Cloudflare Sewing Kit plugin:

```ts
// In an app’s Sewing Kit configuration, like app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp());
  app.use(cloudflareWorkers({serveAssets: false}));
});
```

#### Step 2: Configure Wrangler to upload your built assets

Cloudflare provides [Wrangler](https://github.com/cloudflare/wrangler) as a command line tool for deploying your application to Cloudflare Workers. Before you begin, you’ll need to use this CLI to initialize your project with Cloudflare. Since you already have a codebase, you should follow the [Cloudflare Worker Sites getting started guide](https://developers.cloudflare.com/workers/platform/sites/start-from-existing), which starts by running the following command from the root of your repository:

```zsh
wrangler init --site my-app-name
```

After running the command above, a `wrangler.toml` will exist at the root of your repo. In addition to the basic configuration that needs to be added in this file, like your Cloudflare account ID, you will need to change the `build` and `site` sections of the configuration to point at the locations where Quilt will generate your assets.

Quilt supports the two different formats for Cloudflare Workers: the newer [modules format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#modules), and the earlier [service worker-style API](https://developers.cloudflare.com/workers/cli-wrangler/configuration#service-workers). These two formats require different changes to your `wrangler.toml` file:

##### Option 1: Deploying your app in modules format

> **Note:** deploying your Cloudflare Worker using the module format is the default for Quilt, because it matches Quilt’s general preference for using native ES modules when possible. However, as of June 17, 2021, the module format is still in beta and requires a paid account. If you want to deploy to Cloudflare without paying anything, you’ll need to refer to the service worker instructions instead.

Replace any initial configuration for `build` and `site` with the following snippet:

```toml
[build]
command = "yarn install && yarn build"

[build.upload]
format = "modules"
dir = "./build/server"
main = "./index.mjs"

[site]
bucket = "./build/assets"
entry-point = "."
```

With this configuration, you’re already ready to run `wrangler publish` to deploy your application. Just for completeness, though, let’s cover each section you just added to your `wrangler.toml` file in a bit more detail.

```toml
[build]
command = "yarn install && yarn build"
```

This configuration tells Wrangler to install your dependencies and run your NPM `build` script before deploying your worker. This line assumes that you have a sibling `package.json` to your `wrangler.toml` that contains a script section that looks something like this:

```json
{
  "scripts": {
    "build": "sewing-kit build"
  }
}
```

```toml
[build.upload]
format = "modules"
dir = "./build/server"
main = "./index.mjs"
```

This section of your configuration tells Wrangler to use the modules format for your worker. It also tells Wrangler where to look for your server-side assets. Quilt outputs these assets into `build/server` (relative to the app’s `sewing-kit.config.ts`) by default, with `index.mjs` as the entry into the worker.

```toml
[site]
bucket = "./build/assets"
entry-point = "."
```

This final section configures [Cloudflare Sites](https://developers.cloudflare.com/workers/platform/sites), which is an additional part of your worker that manages your static assets. This part of the configuration tells Wrangler where the static assets Quilt produces will be on disk.

If you are passing `serveAssets: false` in the [Cloudflare Sewing Kit plugin](#step-1-add-the-cloudflare-sewing-kit-plugin), you can omit this section entirely.

##### Option 2: Deploying your app in the service worker format

Replace any initial `build` configuration in your `wrangler.toml` with the following snippet:

```toml
[build]
command = "yarn install && yarn build"

[build.upload]
format = "service-worker"

# As noted above, if you are passing serveAssets: false in your Sewing Kit
# configuration, you do not need to include this configuration.
[site]
bucket = "./build/assets"
entry-point = "."
```

This new configuration tells Wrangler to use the `service-worker` format, and teaches it how to build your project. The build command above assumes you have an NPM `build` script in your `package.json` that looks something like this:

```json
{
  "scripts": {
    "build": "sewing-kit build"
  }
}
```

Wrangler looks at your project’s `package.json` `main` field to know what file to upload, so you’ll also need to update that value to point at the server-side worker file Quilt builds for you:

```json
{
  "main": "./build/server/index.js"
}
```

#### Step 3: Deploy your app to Cloudflare

With the configuration above, you should be ready to publish your app to Cloudflare. You can do so by running the following command from the directory that contains your `wrangler.toml`:

```zsh
wrangler publish
```

You should get feedback from this command about the URL your application is deployed to. Visit that URL, and enjoy your new, super fast, super tiny web application!

### Deploying a service

Quilt also comes with a way to automatically turn your backend services into Cloudflare Workers. To use this transformation, your service must be written using [Quilt’s `http-handlers` library](./TODO), which provides a simple abstraction over HTTP requests and responses.

> **Note:** `@quilted/http-handlers` is a very small library that is meant to expose only the small set of APIs that overlap between many server environments. If you are heavily using Cloudflare’s APIs, you may not be able to use this automatic transformation, and will need to instead author the full Cloudflare Workers runtime code for your function. In that case, you can set `httpHandler: false` in your Sewing Kit config for this service, which runs a build without the automatic transformations.

#### Step 1: Write your service using `@quilted/http-handlers`

As noted above, you will need to author your function using the tiny HTTP library in `@quilted/http-handlers` to get automatic transformations for Cloudflare Workers. You’ll first need to install this library as a dependency, either of the whole repo (as shown below) or for an individual service inside the repo:

```zsh
yarn install @quilted/http-handlers
```

You can review the [documentation for this library](./TODO) to see the full set of APIs it provides. A simple JSON API could be implemented as follows:

```ts
// In a file for your service, say, functions/api/index.ts

import {createHttpHandler, json} from '@quilted/http-handlers';

const handler = createHttpHandler();

handler.get(() => json({hello: 'world!'}));

export default handler;
```

#### Step 2: Add the Cloudflare Sewing Kit plugin

Import the Cloudflare plugin to your services’s `sewing-kit.config.ts` file. The new plugin can go anywhere in your configuration, but we generally recommend putting the plugin later in your configuration, so the build setup it adds overwrites settings provided by other plugins.

```ts
// In an service’s Sewing Kit configuration, which would be
// functions/api/sewing-kit.config.ts in the example from the
// previous step.

import {createService, quiltService} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createService((service) => {
  service.use(quiltService());
  service.use(cloudflareWorkers());
});
```

By default, Quilt produces Cloudflare Workers in the newer [modules format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#modules), which current requires a paid Cloudflare plan. If you want to deploy to a free Cloudflare account, you will need to update the Cloudflare Sewing Kit plugin to change the output format to [service-worker](https://developers.cloudflare.com/workers/cli-wrangler/configuration#service-workers):

```ts
import {createService, quiltService} from '@quilted/sewing-kit';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createService((service) => {
  service.use(quiltService());
  service.use(cloudflareWorkers({format: 'service-worker'}));
});
```

#### Step 3: Configure Wrangler to upload your worker’s code

As detailed in the section on [deploying an application to Cloudflare](#step-2-configure-wrangler-to-upload-your-built-assets), Cloudflare provides [Wrangler](https://github.com/cloudflare/wrangler) as a command line tool for deploying to Cloudflare Workers, so you will need to install this CLI before continuing. You can [initialize a Cloudflare Worker](https://developers.cloudflare.com/workers/get-started/guide) by running the following command in the directory with your service’s code:

```zsh
wrangler init my-service-name
```

After running the command above, a `wrangler.toml` will exist at the root of your repo. As with deploying an application, you will need to customize some of the configuration in this file, but the edits depend on which format you’d like to use for the worker: [modules](#option-1-deploying-your-worker-in-modules-format) or [service worker](#option-2-deploying-your-worker-in-service-worker-format)

##### Option 1: Deploying your worker in modules format

> **Note:** deploying your Cloudflare Worker using the module format is the default for Quilt, because it matches Quilt’s general preference for using native ES modules when possible. However, as of June 17, 2021, the module format is still in beta and requires a paid account. If you want to deploy to Cloudflare without paying anything, you’ll need to refer to the service worker instructions instead.

Replace any initial `build` configuration in your `wrangler.toml` with the following snippet:

```toml
[build]
command = "yarn install && yarn build"

[build.upload]
format = "modules"
dir = "./build/runtime"
main = "./index.mjs"
```

This new configuration tells Wrangler to use the `modules` format, and teaches it how to build your project. The build command above assumes you have an NPM `build` script in your `package.json` that looks something like this:

```json
{
  "scripts": {
    "build": "sewing-kit build"
  }
}
```

##### Option 2: Deploying your worker in the service worker format

Replace any initial `build` configuration in your `wrangler.toml` with the following snippet:

```toml
[build]
command = "yarn install && yarn build"

[build.upload]
format = "service-worker"
```

This new configuration tells Wrangler to use the `modules` format, and teaches it how to build your project. The build command above assumes you have an NPM `build` script in your `package.json` that looks something like this:

```json
{
  "scripts": {
    "build": "sewing-kit build"
  }
}
```

Wrangler looks at your project’s `package.json` `main` field to know what file to upload, so you’ll also need to update that value to point at the worker file Quilt builds for you:

```json
{
  "main": "./build/runtime/index.js"
}
```

#### Step 4: Deploy your worker to Cloudflare

With the configuration above, you should be ready to publish your worker to Cloudflare. You can do so by running the following command from the directory that contains your `wrangler.toml`:

```zsh
wrangler publish
```

You should get feedback from this command about the URL your worker is deployed to.

### Additional notes

You can use `wrangler dev` to run the development mode for your application or service, but we recommend sticking with `sewing-kit develop`, Quilt’s default development command, instead. Sewing Kit’s `develop` command will run your application, serve your client-side assets, and run your service in Node using a very fast, development-focused tools. In contrast, `wrangler dev` will build the entire workspace to more accurately simulate the production environment.

If you need access to additional Cloudflare Workers globals, like [key-value storage](https://developers.cloudflare.com/workers/runtime-apis/kv) or [WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets), you will have to use `wrangler dev`, as Quilt is not able to simulate this environment correctly.
