# Getting started

Quilt lets you build projects as simple as a single web application, all the way up to a complex workspace filled with multiple [apps, packages, and backend services](./projects). Regardless of the size of the project, the easiest way to get started is to use [`@quilted/create`](../packages/create). This guide will cover a couple common “shapes” of projects using Quilt.

## Before you begin

There are two things you’ll need before you create your first project:

- **A modern version of [Node.js](https://nodejs.org/en/)**. `@quilted/create` is written using Node.js, and is distributed on the public NPM registry. It requires a Node.js version that [supports ES modules](https://nodejs.org/api/esm.html). We recommend using the latest version of Node.js’s [“long-term support” release](https://nodejs.org/en/about/releases/) for most projects. If you don’t know how to manage your Node.js version, we recommend trying [`nvm`](https://github.com/nvm-sh/nvm).

  If you run the `node --version` command and see at least `v14.0.0`, you should be good to continue.

- **A package manager to run the `create` command**. Node.js ships with built-in support for [npm](https://docs.npmjs.com/about-npm), and Quilt works great with this default. If you’d prefer, you can also use [yarn](https://yarnpkg.com) or [pnpm](https://pnpm.io) instead.

  If you don’t already have a favorite package manager, we recommend [pnpm](https://pnpm.io). pnpm is fast, takes up less space on disk, and produces a strict package installation that enforces dependency management best practices.

You’ve now got the tools you need. Open your favorite terminal, go to the directory where you’d like to create your new project, and follow the instructions below to start building.

## Creating an app

A [Quilt app](./projects/apps) is a piece of code meant to run in a web browser. To create an app, you can run one of the following commands, depending on your preferred package manager:

```bash
pnpm create @quilted app # for pnpm
npm create @quilted app # for npm
yarn create @quilted app # for yarn
```

This command will install [`@quilted/create`](../packages/create) and run its included executable. This executable will ask you some questions about the app:

- What **name** you want to use for the app
- The [**template**](#app-templates) you want to start from for your new app

If you run this command from a workspace that already has one or more Quilt projects, the new app will be added as a sibling to the rest. If you don’t already have a workspace, Quilt will ask if you’d like to set one up. You can create your new app as part of a new “monorepo”, ready to include even more applications, packages, and services. You can also create a simpler repo structure if you only plan on building the one application.

Once you’ve run the command and allowed it to complete, you’ll be presented with some instructions on next steps in the terminal. These steps are the final ones leading up to running the `develop` command, which starts your application in a hot-reloading development environment. Quilt can also help you with running important development commands, like [building, testing, linting, and type-checking your code](./cli).

Once you’re ready to make your application public, you can follow one of the [Quilt deployment guides](./projects/apps/deploy).

### App templates

The `@quilted/create` command you ran in the previous section can output a few different structures for your new application. The following templates are available:

- **Basic**, a good starting point for most projects. It includes a minimal file structure that offers lots of flexibility, and a basic [testing setup](./features/testing.md). It also gives you easy access to customize the server-rendering backend code for your application, which allows you to build [custom APIs for your web app](./projects/apps/server.md).

- **Itty-bitty**, a whole Quilt application in a single file. This is the simplest way to get started with Quilt, as you can learn all the basic [features](./features) Quilt makes available to your app by reading just one file.

Regardless of which template you choose, your application will get all of Quilt’s powerful tools for building performant and flexible applications: [server-side rendering](./features/server-rendering.md), [multi-browser asset builds](./projects/apps/browser.md), managing [HTML](./features/html.md) and [HTTP](./features/http.md), and [much more](./features).

## Creating a package

A [Quilt package](./projects/packages) is a piece of code meant to be shared between other projects. These packages are commonly distributed on a public registry, like NPM, but can also be private, for use by other projects in the same repository. Regardless of how you share them, Quilt can help you test and build packages; in fact, Quilt uses itself to manage all its own [packages](../packages).

To create an package, you can run one of the following commands, depending on your preferred package manager:

```bash
pnpm create @quilted package # for pnpm
npm create @quilted package # for npm
yarn create @quilted package # for yarn
```

This command will install [`@quilted/create`](../packages/create) and run its included executable. This executable will ask you some questions about the package:

- What **name** you want to use for the package. If you intend to publish this package with a [scoped name](https://docs.npmjs.com/about-scopes), you should include the scope when asked for the name.
- The **directory** you want to use to contain your new package
- Whether this package will be **public** or **private**
- Whether this package will depend on **React**

If you run this command from a workspace that already has one or more Quilt projects, the new package will be added as a sibling to the rest. If you don’t already have a workspace, Quilt will ask if you’d like to set one up. You can create your new package as part of a new “monorepo”, ready to include even more packages, applications, and services. You can also create a simpler repo structure if you only plan on building the one package.

Once you generate a package, you will be told about a few keys in your `package.json` that you should edit to complete the initial version of your package. After that, you’ll be ready to run the [build, test, lint, and type-check commands](./cli).

### Using a new package inside a monorepo

If you have a monorepo, you likely want to import your new package in another project in your repo. To do so, you’ll need to follow a few more steps.

In the project that depends on your new package, add the the new dependency to your package.json. In general, Quilt recommends using `devDependencies`, because the default build logic in Quilt will bundle these dependencies at build time to optimize performance.

```jsonc
{
  "devDependencies": {
    // ... existing devDependencies
    // Use the name and version from the new package’s package.json
    "my-new-package": "^0.0.0"
  }
}
```

Quilt also recommends you use [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html) for managing a multi-project repository written in TypeScript. In the project that depends on your new package, add the new dependency to the `references` array in its `tsconfig.json` file:

```jsonc
{
  "references": [
    // ... existing references
    // Use the relative path from this tsconfig.json to the new package
    {"path": "../packages/my-new-package"}
  ]
}
```

Finally, from the root of your repository, run your package manager’s install command to account for the new dependency:

```bash
pnpm install # for pnpm
npm install # for npm
yarn install # for yarn
```

## Need help?

Did this guide not leave you with a working project? Are you unsure of what to do next? We’d really appreciate you [raising an issue](https://github.com/lemonmade/quilt/issues/new) so we can help you out, and so we can make the experience of getting started with Quilt smooth for others.
