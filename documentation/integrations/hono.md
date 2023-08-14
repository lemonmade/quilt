# Using [Hono](https://hono.dev)

Hono is a small, simple, and ultrafast web framework. It is meant for running on Edge runtimes, like [Cloudflare Workers](https://workers.cloudflare.com), and works great with Quilt’s support for [backend services](../projects/services/) and [server-side rendering](../projects/apps/server.md).

This guide will show how to use Hono in a Quilt backend service. If you don’t already have a service, the easiest way to get started is to follow the [service creation guide](../getting-started.md#creating-a-service). Once you have a service, you’ll need to install the `hono` package:

```bash
# npm
npm install --save-dev hono
# pnpm
pnpm install --save-dev hono
# yarn
yarn add --dev hono
```

The template service uses Quilt’s [request router feature](../features/request-routing.md), which lets you easily run request handlers based on on the standard Web [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) APIs. Hono uses these exact APIs, so you can use Quilt’s build and development tools with Hono without any extra configuration.

Replace the contents of your service’s entry file with any valid Hono service, and you’re ready to go! Here’s a simple example, showing a backend service that responds with a “Hello, world!” message:

```ts
import {Hono} from 'hono';
const app = new Hono();

app.get('/', (c) => c.text('Hono!'));

export default app;
```
