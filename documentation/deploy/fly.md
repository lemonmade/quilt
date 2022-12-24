# Deploy to Fly.io

[Fly.io](https://fly.io) lets you deploy full-stack applications with an [intuitive CLI](https://fly.io/docs/flyctl/) and [easy-to-use deploy configuration](https://fly.io/docs/reference/configuration/). Fly.io makes it easy to deploy Node applications, and Quilt produces Node outputs by default, so the two work great together.

## Deploying an app

Before you begin, make sure you have [created a Quilt application](../getting-started.md). You’ll also need to install [flyctl, the Fly.io command line interface](https://fly.io/docs/flyctl/).

You can deploy the server created by Quilt’s [automatic server-side rendering feature](./TODO) to Fly as a Node application. The default Node application produced by Quilt will also service your browser assets.

We’re going to use a [Dockerfile](https://fly.io/docs/getting-started/dockerfile/). While Fly is able to deploy a Node application without any extra configuration on your part, we like to explicitly define a Dockerfile to keep the resulting “build image” as small as possible. Quilt creates tiny bundles, even for the server, and inlines dependencies by default, so you can get a much tinier (and faster) server with a little extra configuration.

Create a file called `Dockerfile` at the root of your application, and include this content:

```dockerfile
FROM node:16-bullseye-slim as base

WORKDIR /app

COPY package.json .
COPY build/assets build/assets
COPY build/server build/server

ENV NODE_ENV production

CMD ["node", "./build/server/index.js"]
```

This Dockerfile assumes that you will build your application outside the Docker image, and then copies the files you need at runtime into the image (the `COPY` statements). It uses a slim base Docker image that includes Node 16 (the `FROM` statement), and has the container run the server output file with node when it starts up (the `CMD` statement).

Next, you’ll use flyctl to create a new application on Fly. Run the Fly launch command to get started:

```bash
fly launch
```

> **Note:** if you are working on an app that is part of a [monorepo](./TODO), you’ll want to run the `fly launch` command from inside the app’s directory, **not** from the root of your project. Your `Dockerfile` should also be placed in the root of your application, not the root of your workspace.

Follow the prompts to get started. You’ll be asked to name your app, and to configure some aspects of your deployment. You will also be asked whether you want to deploy your application right away — select “No” for now, so we can review the output before we deploy.

If you look at your app, you should see a new `fly.toml` file. This file configures how Fly [deploys your application](https://fly.io/docs/reference/configuration/).

There’s lots of interesting things you can configure in here, but for now, we just need to add one thing: an environment variable specifying the port for our application to listen on. Find (or add) an `env` section in your `fly.toml`, and add a `PORT` environment variable specifying `8080`, the port Fly will forward requests to.

```toml
# More content above...

[env]
PORT = "8080"

# And more content below!
```

You’re now ready to deploy! Run the following command to build your app, and then hand it off the Fly to deploy:

```bash
pnpm quilt build && flyctl deploy
```

> **Note:** if you’re deploying an application in a monorepo, run `flyctl deploy` from the root of your workspace, and append the path to your application. For example, if your app is in `./app`, run `pnpm quilt build && flyctl deploy app`.

You’ll see Quilt building your application, followed by Fly building your Docker image and deploying it to their platform. Once the deploy command completes successfully, you can visit your new application at its new home on the internet! A quick way to see it is to run the `flyctl open` command (or `flyctl open --config ./path/to/fly.toml`, if running in a monorepo).

Have fun building your new application!

## Deploying a service

Before you begin, make sure you have [created a Quilt service](../getting-started.md). You’ll also need to install [flyctl, the Fly.io command line interface](https://fly.io/docs/flyctl/).

You can deploy a backend service written with Quilt to Fly as a Node application. Quilt builds your service for Node by default, so it’s a few short steps to get your application online.

We’re going to use a [Dockerfile](https://fly.io/docs/getting-started/dockerfile/). While Fly is able to deploy a Node application without any extra configuration on your part, we like to explicitly define a Dockerfile to keep the resulting “build image” as small as possible. Quilt creates tiny bundles, even for the server, and inlines dependencies by default, so you can get a much tinier (and faster) server with a little extra configuration.

Create a file called `Dockerfile` at the root of your application, and include this content:

```dockerfile
FROM node:16-bullseye-slim as base

WORKDIR /app

COPY package.json .
COPY build/assets build/assets
COPY build/server build/server

ENV NODE_ENV production

CMD ["node", "./build/runtime/index.js"]
```

This Dockerfile assumes that you will build your application outside the Docker image, and then copies the files you need at runtime into the image (the `COPY` statements). It uses a slim base Docker image that includes Node 16 (the `FROM` statement), and has the container run the server output file with node when it starts up (the `CMD` statement).

Next, you’ll use flyctl to create a new application on Fly. Run the Fly launch command to get started:

```bash
fly launch
```

> **Note:** if you are working on a service that is part of a [monorepo](./TODO), you’ll want to run the `fly launch` command from inside the service’s directory, **not** from the root of your project. Your `Dockerfile` should also be placed in the root of your service, not the root of your workspace.

Follow the prompts to get started. You’ll be asked to name your server-side code, and to configure some aspects of your deployment. You will also be asked whether you want to deploy your application right away — select “No” for now, so we can review the output before we deploy.

If you look at your app, you should see a new `fly.toml` file. This file configures how Fly [deploys your service](https://fly.io/docs/reference/configuration/).

There’s lots of interesting things you can configure in here, but for now, we just need to add one thing: an environment variable specifying the port for our application to listen on. Find (or add) an `env` section in your `fly.toml`, and add a `PORT` environment variable specifying `8080`, the port Fly will forward requests to.

```toml
# More content above...

[env]
PORT = "8080"

# And more content below!
```

You’re now ready to deploy! Run the following command to build your app, and then hand it off the Fly to deploy:

```bash
pnpm quilt build && flyctl deploy
```

> **Note:** if you’re deploying an service in a monorepo, run `flyctl deploy` from the root of your workspace, and append the path to your service. For example, if your app is in `./api`, run `pnpm quilt build && flyctl deploy api`.

You’ll see Quilt building your workspace, followed by Fly building your Docker image and deploying it to their platform. Once the deploy command completes successfully, you can visit your new application at its new home on the internet! A quick way to see it is to run the `flyctl open` command (or `flyctl open --config ./path/to/fly.toml`, if running in a monorepo).

Have fun building your new service!
