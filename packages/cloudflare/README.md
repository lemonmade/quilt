# `@quilted/cloudflare`

This library provides a set of runtime utilities and build configuration that can adapt Quilt [apps](./TODO) and [services](./TODO) to run on Cloudflare.

If you’re using Quilt’s [automatic app server](./TODO) or [HTTP handler](./TODO) features, configuring your projects to run on Cloudflare is pretty straightforward. We’ve written a [comprehensive guide to deploying Quilt on Cloudflare](../../documentation/deploy/cloudflare.md) that covers the necessary configuration for Quilt and [Wrangler](https://github.com/cloudflare/wrangler), the CLI provided by Cloudflare for deploying to their platform.

## Getting the library

Install this library as a development dependency by running the following command:

```zsh
yarn install @quilted/cloudflare --dev
```

## Using the library

### `@quilted/cloudflare/sewing-kit`

The `sewing-kit` entry in this package includes plugins for [Sewing Kit](./TODO), Quilt’s tooling orchestrator. Currently, there is only a single export, `cloudflareWorkers`, which returns a Sewing Kit plugin that configures a project to run as a [Cloudflare Worker](https://developers.cloudflare.com/workers/). This Sewing Kit plugin can be used for an app, where it configures the [automatic server-rendering server](./TODO) to run as a worker (including the ability to serve static assets from [Cloudflare Sites](https://developers.cloudflare.com/workers/platform/sites)). It can also be used for a service, where any use of [`@quilted/http-handlers`](./TODO) is adapted to run on Cloudflare Workers.

```ts
// app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp({autoServer: true}));
  app.use(cloudflareWorkers());
});
```

The `cloudflareWorkers` function accepts a few options for customizing the resulting files. One particularly important option is `format`, where you can change the format of the generated workers from the [modules format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#modules) to the [service workers format](https://developers.cloudflare.com/workers/cli-wrangler/configuration#service-workers). The modules format is the default, as it is more modern and in line with Quilt’s [preference for native ES modules](./TODO), but this format is not currently available without a paid Cloudflare Workers plan.

```ts
// app/sewing-kit.config.ts

import {createApp, quiltApp} from '@quilted/craft';
import {cloudflareWorkers} from '@quilted/cloudflare/sewing-kit';

export default createApp((app) => {
  app.use(quiltApp({autoServer: true}));
  app.use(cloudflareWorkers({format: 'service-worker'}));
});
```

Additional options are documented in code, so refer to your editor’s intellisence for details.

### `@quilted/cloudflare/http-handlers`

The `http-handlers` entry point exports a few utility functions for adapting handlers from [`@quilted/http-handlers`](../http-handlers) to the Cloudflare Workers runtime. They are mostly used internally by `@quilted/cloudflare/sewing-kit`, but might also be useful for writing more complex, custom adaptors.

All utilities from this library are documented in code.
