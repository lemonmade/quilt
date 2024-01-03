# Priorities

My name is [Chris Sauve](https://github.com/lemonmade), and I wrote Quilt. The framework is a generalization of patterns I worked on over the years, primarily while building [Shopify’s](https://shopify.com) merchant admin and checkout applications. I hope you like Quilt, but it has an opinionated design that not everyone will like. It has also focused a few design goals that make it well suited for some projects, and poorly suited for others.

This document outlines the priorities that were chosen, and some examples of how those decisions affect developers using Quilt. These priorities are listed in descending order of importance; when they are in conflict, we try to prefer the priority listed first.

## Performance

Quilt wants to give you all the core capabilities you need to build even the most complex projects, but does not want to force end users to pay the cost of that convenience.

When using Quilt, you only ship what you actually use. Even if you build an app with every [feature of the framework](./features), Quilt only contributes about 20Kb of bundle size (minified and compressed), and that includes [Preact](./technology/preact.md)!

Building a performance-focused framework in JavaScript is not easy, and it comes with some tradeoffs you should consider:

- Quilt will build your projects in multiple formats to produce the smallest end-user bundle sizes. For example, when you build an app, Quilt builds your app for [multiple browser groups with different supported features](./projects/apps/browser.md#browser-targets), and builds your app once for each [supported language](./features/localization.md). These choices produce optimized assets, but take more time to build, and take up more storage space on your deployment platform.
- Quilt uses [Preact instead of React](./technology/preact.md), because the “real” React is several times larger than Preact. Quilt uses a special setup that should make most packages targeting React work just fine in your project, but you may still run into compatibility mismatches in some cases.
- When using Quilt, you generally need to explicitly opt in to using some features, rather than them being enabled automatically. For example, features like [routing](./features/routing.md), [HTML document management](./features/html.md), and [localization](./features/localization.md) require you to render components in your app in order to be enabled.

## Type safety

In my experience, type safety is critical for projects as they get complicated, and especially as multiple developers start contributing. I also find that I personally benefit from the structure of starting with a type system to describe the important parts of a particular technical domain, before filling out an implementation that satisfies the types.

Quilt tries to deliver excellent support for using [TypeScript](./technology/typescript.md) across your project. Quilt is authored in TypeScript, so you get excellent TypeScript types for all of its APIs. Quilt also provides guidance for publishing [your own packages with types](./projects/packages/publishing.md#types).

Not everyone likes types in general, or TypeScript specifically. They can sometimes make code more verbose, and can add a higher barrier to entry for contributions. You’ll also need some additional configuration files in your project to manage TypeScript.

Here are a few of the impacts of focusing on strong type safety in Quilt:

- Some API patterns you may be familiar with in other web frameworks are not available in Quilt because they can’t be made type safe. For example, Quilt does not support defining [route matches using a string shorthand, like `/users/:id`](./features/routing.md).
- Quilt has its own version of some popular community libraries to provide type-safe implementations. Quilt has its own [GraphQL type generation](./features/graphql.md), instead of using a tool like [GraphQL Codegen](./TODO), in order to provide automatic type safety for usage of GraphQL documents in runtime and test code.

## Component-first

## Flexibility

## Explicitness

## Match community best practices

## Small-but-mighty
