# Deploying to Netlify

[Netlify](https://www.netlify.com) makes it easy to deploy [static sites](https://www.netlify.com/products/build/), which Quilt supports as [an optional feature](../static-rendering.md). Netlify has lots of developer-friendly features, like Git-based deployments and branch previews, that make it popular with many teams.

This guide will cover how to deploy your application as a static site on Netlify. It assumes you have already [created an app or service with Quilt and Sewing Kit](./TODO).

## Getting started

To configure your builds to target Netlify, you’ll first need to install the `@quilted/netlify` package, which contains all the necessary build configuration:

```zsh
yarn add @quilted/netlify --dev
```

If you are working on a monorepo and have many projects with their own `package.json`s, you can install `@quilted/netlify` as a `devDependency` for the entire workspace, or you can install it as a `devDependency` for each individual project — the choice is yours.
