# `@quilted/cloudflare`

This library provides a set of runtime utilities and build configuration that can adapt Quilt [apps](../../documentation/projects/apps) and [services](../..) to run on Cloudflare.

If you’re using Quilt’s [automatic app server](../../documentation/projects/apps/server.md) or [HTTP request router](../../documentation/features/request-routing.md) features, configuring your projects to run on Cloudflare is pretty straightforward. We’ve written a [comprehensive guide to deploying Quilt on Cloudflare](../../documentation/deploy/cloudflare.md) that covers the necessary configuration for Quilt and [Wrangler](https://github.com/cloudflare/wrangler), the CLI provided by Cloudflare for deploying to their platform.

## Getting the library

Install this library as a development dependency by running the following command:

```zsh
pnpm install @quilted/cloudflare --save-dev
```

## Using the library

### Configuring your `build` and `develop` commands

The `craft` entry in this package includes plugins for [Craft](../../documentation/craft.md), Quilt’s tooling orchestrator. Currently, there is only a single export, `cloudflareWorkers`, which returns a plugin that configures a project to run as a [Cloudflare Worker](https://developers.cloudflare.com/workers/). This plugin can be used for an app, where it configures the [automatic server-rendering server](../../documentation/projects/apps/server.md) to run as a worker (including the ability to serve static assets from [Cloudflare Sites](https://developers.cloudflare.com/workers/platform/sites)). It can also be used for a service, where any use of [`@quilted/request-router`](../../documentation/features/request-routing.md) is adapted to run on Cloudflare Workers.

When included, this plugin will configure your project to run on Cloudflare Workers. This includes a few adjustments to your project’s tooling configuration:

- Build outputs are configured to be in the proper module format, with the file extension Cloudflare expects, and with all dependencies inlined
- The `develop` command runs your code in [Miniflare](https://miniflare.dev) to closely resemble the production Cloudflare Workers environment
- For apps, the `build` command can produce a worker that will automatically serve browser assets from a [Workers Site](https://developers.cloudflare.com/workers/platform/sites/)

In most cases, all you need to do is include the `cloudflareWorkers` plugin in your project’s `quilt.project.ts` file:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(quiltApp());
  project.use(cloudflareWorkers());
});
```

The `cloudflareWorkers` function accepts a few options for customizing the resulting files. One particularly important option is `format`, where you can change the format of the generated workers from the [modules format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#modules) to the [service workers format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#service-workers). The modules format is the default, as it is more modern and in line with Quilt’s [preference for native ES modules](./TODO), but the service worker format is available for those who prefer it.

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(quiltApp());
  project.use(cloudflareWorkers({format: 'service-worker'}));
});
```

#### Using Cloudflare’s native APIs instead of `@quilted/request-router`

You can also use Quilt build your project “as-is”, using Cloudflare’s native module-based APIs. You might want to do this if your worker doesn’t need the routing utilities provided by `@quilted/request-router`, or you want to make use of non-HTTP APIs available in Cloudflare, like [scheduled events](https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/) or [Cloudflare Queues](https://developers.cloudflare.com/queues/javascript-apis/#consumer).

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

Then, when setting up the Cloudflare plugin in the next section, you will need to pass `format: 'custom'` in the `quiltService` plugin’s options to tell Quilt to skip the automatic transformations:

```ts
import {createProject, quiltService} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default createProject((project) => {
  project.use(quiltService({format: 'custom'}));
  project.use(cloudflareWorkers());
});
```

Additional options are documented in code, so refer to your editor’s intellisence for details.

### Using Cloudflare platform features

Cloudflare offers a number of features on top of the basic `fetch()` API to help you write powerful backend applications. Quilt exposes two of the most important features for you use in your request handlers: [access to Cloudflare “bindings”](#accessing-cloudflare-bindings), and [accessing Cloudflare’s `cf` object](#accessing-the-cloudflare-cf-object).

#### Accessing Cloudflare bindings

In a Cloudflare Worker, [“bindings”](https://developers.cloudflare.com/workers/platform/bindings/) let your code interact with resources on the Workers platform. This can include anything from [environment variables](https://developers.cloudflare.com/workers/platform/environment-variables/), to the [KV datastore](https://developers.cloudflare.com/workers/runtime-apis/kv/#kv-bindings), to [Queues](https://developers.cloudflare.com/queues) and more.

Quilt provides these bindings on the second `context` argument to a [`@quilted/request-router` handler](../../documentation/features/request-routing.md), nested under the `env` key. To get strong type-checking on these values, though, you will need to teach Quilt what bindings are available for a given project. You can do this by extending the `CloudflareRequestEnvironment` interface with your project’s bindings. Cloudflare provides the types of all bindings in the [`@cloudflare/workers-types` package](https://www.npmjs.com/package/@cloudflare/workers-types), so you should install this as a development dependency of your project.

```ts
import type {KVNamespace} from '@cloudflare/workers-types';
import {createRequestRouter, json} from '@quilted/request-router';

declare module '@quilted/cloudflare' {
  interface CloudflareRequestEnvironment {
    // Example of an environment variable
    readonly SECRET_KEY: string;
    // Example of a KV datastore
    readonly DATA: KVNamespace;
  }
}

const router = createRequestRouter();

router.get((request, {env}) => {
  if (request.headers.get('X-Secret') !== env.SECRET_KEY) {
    return new Response('Invalid secret', {status: 401});
  }

  return json({
    data: await env.DATA.get('some-key'),
  });
});

export default router;
```

#### Accessing the Cloudflare `cf` object

The [`cf` object](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties) is provided by Cloudflare and provides details about the request, like geolocation of the IP address. The `cf` object is provided on the second `context` argument to a [`@quilted/request-router` handler](../../documentation/features/request-routing.md):

```ts
// In a file for your service, say, functions/api/api.ts

import {createRequestRouter, html} from '@quilted/request-router';

const router = createRequestRouter();

router.get((_, {cf}) => {
  const greeting = cf?.country ? `user from ${cf.country}` : 'mystery user';

  return html(`<body>Hello to you, ${greeting}!</body>`);
});

export default router;
```

### `@quilted/cloudflare/request-router`

The `request-router` entry point exports a few utility functions for adapting request routers from [`@quilted/request-router`](../request-router) to the Cloudflare Workers runtime. They are mostly used internally by `@quilted/cloudflare/craft`, but might also be useful for writing more complex, custom adaptors.

All utilities from this library are documented in code.
