# `quilt`

Quilt is a component-first framework for building complex web applications. It is highly flexible and customizable, but makes no compromises on [performance](./performance) — the whole framework is less than 15kb when minified and compressed.

Quilt provides a collection of libraries for handling common needs in web development, including [routing](./documentation/features/routing), [adding content to the `<head>`](./documentation/features/html), [internationalization](./documentation/features/i18n), and [unit testing](./documentation/features/testing). It also provides powerful abstractions for optimizing performance through [async loading and preloading](./documentation/features/async), component-driven control of [server-side rendering](./documentation/features/server-rendering), and [offloading code to workers](./documentation/features/workers).

Quilt works best with applications that use [TypeScript](./documentation/technology/typescript), [GraphQL](./documentation/technology/graphql), and [React (or a React-compatible variant)](./documentation/technology/react). You can still use Quilt without using TypeScript, GraphQL, or React, but we focus on optimizing the holistic experience of using these three technologies together.

[Sewing Kit](./documentation/sewing-kit) is a sister project to Quilt. It provides a layer for you to deeply customize the configuration of how Quilt handles the `dev`, `test`, `lint`, `type-check`, and `build` commands for your application.

Ready to learn more? Check out the [getting started guide](./documentation/getting-started.md).
