# Workspaces and projects

Quilt and [Craft](./craft.md) let you organize your repo however you like, but they do require you to describe that structure so that they can run your build, testing, and linting commands effectively.

In Quilt, your repo is referred to as a **“workspace”**. A workspace can contain any number of **“projects”**, which represent distinct codebases that are built and deployed separately. A project can be anything, but Quilt provides special handling for three broad types of projects:

- An **app**, which are projects that users interact with directly, typically as a web application.
- A **service**, which are parts of the codebase that are deployed to the backend. This category could include what we traditionally think of as “servers”, but it is also used to represent smaller pieces of code that are deployed as serverless functions, cron triggers, and more.
- A **package**, which is a library that is consumed by an app or service, or published for consumption by other developers.

A workspace can have any number of these projects, which allows it to support anything from a codebase that just has a single app in it, all the way to a monorepo with multiple apps, services, and packages. Some tools, like [ESLint](../features/linting.md), are configured and run at the workspace level; some, like [Vite](../features/developing/apps.md), are instead run at the project level; and still others, like [Jest](../features/testing.md), are a bit of a mix.

## Defining your workspace and projects

[Craft](./craft.md) uses `quilt.workspace.ts` and `quilt.project.ts` files for configuring the development commands in your repo. When you run a development command, Craft will first find all nested `quilt.project.ts` files in order to build up its picture of your repo.

The simplest Quilt project would only have a single `quilt.project.ts` file at the root of the repo. That project would use the `createProject` function from `@quilted/craft` to declare that your entire workspace is just a single project:

```ts
// quilt.project.ts

// We’re also importing the quiltApp and quiltWorkspace sewing-kit plugins here,
// which add all tooling integrations Quilt provides for apps and the overall
// workspace.
import {createProject, quiltApp, quiltWorkspace} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltApp(), quiltWorkspace());
});
```

In workspace with more than a single project, a root `quilt.workspace.ts` file is used only to describe the workspace, not individual projects. You’ll need to switch it to use `createWorkspace`, and you’ll need to remove any Sewing Kit plugins that only apply to a single project, like `quiltApp()`:

```ts
// quilt.workspace.ts

import {createWorkspace, quiltWorkspace} from '@quilted/craft';

export default createWorkspace((workspace) => {
  workspace.use(quiltWorkspace());
});
```

Then, for each of your projects, you’ll have a separate `quilt.project.ts` that that describes the details for that app, service, or package:

```ts
// app/quilt.project.ts

import {createProject, quiltApp} from '@quilted/craft';

export default createProject((project) => {
  project.use(createProject({entry: './App.tsx'}));
});

// functions/api/quilt.project.ts

import {createProject, quiltService} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltService({entry: './api.ts'}));
});

// packages/package-one/quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltPackage());
});

// packages/package-two/quilt.project.ts

import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltPackage());
});
```

Not everyone loves to have lots of configuration files in their project, but we really like having this approach for Quilt. It makes the structure of your repo clear and precise, because you are in complete control. Because these files are the same ones you use to configure [Craft plugins](./craft.md#plugins), it also gives you a spot to easily customize individual projects for their unique needs.

## Quilt’s support for different project types

Quilt supports apps, packages, and services, but does not support them all equally.

### Apps

Quilt’s focus is on building web applications, so its support for apps is the most extensive. Every feature of Quilt, including [i18n](../features/i18n.md), [workers](../features/workers.md), and [async loading](../features/async.md), are fully supported in applications.

Most other documentation in this repo is focused on using Quilt for apps. There are also extensive guides on the [different build strategies available for Quilt apps](../features/builds/apps) and [Quilt’s application development mode](../features/developing/apps.md). All of our [deployment guides](./deploy) also provide detailed instructions for deploying applications to various hosting platforms.

### Packages

Quilt is used to build itself, so its support for packages (including complex package monorepos, like this one) is pretty solid. Quilt’s `lint`, `test`, and `type-check` commands all work great for packages, and Quilt provides a [build strategy for packages](../features/builds/packages) that allows packages built with Quilt to be compiled to the browser targets of Quilt apps that consume them. However, Quilt does not do anything for packages when running the [`develop` command](../features/developing/apps.md).

Packages can easily compose React components and hooks from any Quilt package as they normally would. However, some utilities that depend on build integrations, like [async](../features/async.md) or [worker](../features/workers.md) components, may not work correctly if used by libraries.

### Services

Quilt loves services, but they are the lowest-priority project type that Quilt supports. The biggest reason for this is that Quilt is entirely focused on JavaScript, and backend services are often authored in other languages. We think that’s great — you should use the language that best matches the problem you are solving when it comes to server-side development. Quilt gives you an option for authoring backend services in JavaScript, but we expect many people won’t use them.

Quilt provides a [good build command for services](../features/builds/services.md) that bundles them up for faster execution. These builds work for any JavaScript project, but Quilt also provides an abstraction over [routing HTTP requests](../features/request-routing.md) that you can use instead. These “http handlers” offer a tiny way of describing HTTP-based services in a way that can be [automatically adapted to different hosting platforms](./deploy).

```ts
// This simple JSON API can be adapted to run on Cloudflare Workers,
// AWS Lambda, a Node service on Render, and more, all just by changing
// your quilt.project.ts file!

import {createHttpHandler, json} from '@quilted/request-router';

const handler = createHttpHandler();

handler.get('/api', () => json({hello: 'world'}));

export default handler;
```

Quilt also supports a [minimal development flow](../features/developing/services.md) for services so you can preview your work locally.
