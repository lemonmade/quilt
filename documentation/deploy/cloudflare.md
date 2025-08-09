# Deploying to Cloudflare

Quilt makes it easy to ship small-but-mighty apps and services as as [Cloudflare Workers](https://workers.cloudflare.com), and its design goal of being small and Web Standards-oriented is a perfect fit for the lightweight environment of Workers.

## Deploying an app as a Cloudflare Worker

Quilt comes with a dedicated Cloudflare package, [`@quilted/cloudflare` package](../../integrations/cloudflare/), that will configure your applications and services to run on Cloudflare’s infrastructure. Install it as a dev dependency, either at the root of your workspace or in one individual project:

```bash
pnpm install @quilted/cloudflare --save-dev
# or
npm install @quilted/cloudflare --save-dev
# or
yarn add @quilted/cloudflare --dev
```

Once installed, you’ll need to update your Rollup configuration to output files in a format that work well with Cloudflare Workers. You can use the `cloudflareWorkersApp()` helper to do this:

```js
// ./app/rollup.config.js

import {quiltApp} from '@quilted/rollup/app';
import {cloudflareWorkersApp} from '@quilted/cloudflare/craft';

export default quiltApp({
  runtime: cloudflareWorkersApp(),
});
```

Finally, you’ll need to tell Cloudflare where your built files will be located. Rollup will build your server file in `./build/server/server.js`, and your browser assets in `./build/public/`. You can configure Cloudflare to use this server entrypoint, and to serve your browser assets automatically, using the following `wrangler.toml` configuration:

```toml
# ./app/wrangler.toml
name = "my-cloudflare-worker"
main = "./build/server/server.js"

[assets]
directory = "./build/public"
```

If you are not using Cloudflare’s automatic asset hosting feature, you can remove the `[assets]` section from your `wrangler.toml` file.

With just these two small changes, you are ready to deploy. Run `pnpm run build && pnpm exec wrangler deploy`, and your full-stack application should be live on Cloudflare.

## Deploying a service as a Cloudflare Worker

Quilt comes with a dedicated Cloudflare package, [`@quilted/cloudflare` package](../../integrations/cloudflare/), that will configure your applications and services to run on Cloudflare’s infrastructure. Install it as a dev dependency, either at the root of your workspace or in one individual project:

```bash
pnpm install @quilted/cloudflare --save-dev
# or
npm install @quilted/cloudflare --save-dev
# or
yarn add @quilted/cloudflare --dev
```

Once installed, you’ll need to update your Rollup configuration to output files in a format that work well with Cloudflare Workers. You can use the `cloudflareWorkersApp()` helper to do this:

```js
// ./service/rollup.config.js

import {quiltService} from '@quilted/rollup/service';
import {cloudflareWorkers} from '@quilted/cloudflare/craft';

export default quiltService({
  runtime: cloudflareWorkers(),
});
```

Finally, you’ll need to tell Cloudflare where your built files will be located. Rollup will build your server file in `./build/server/server.js`. You can configure Cloudflare to use this server entrypoint using the following `wrangler.toml` configuration:

```toml
# ./service/wrangler.toml
name = "my-cloudflare-worker"
main = "./build/server/server.js"
```

With just these two small changes, you are ready to deploy. Run `pnpm run build && pnpm exec wrangler deploy`, and your server should be live on Cloudflare.
