# Quilt application conventions

## Entry files

TODO

## Top-level directories and import aliases

Quilt’s [application templates](../../getting-started.md#app-templates) follow a convention for a few important top-level directories. Aside from the simpler, single-file templates, a new Quilt app will have the following directories:

- [`./shared`](#shared), which contains code used across your application
- [`./tests`](#tests), which contains code used across your application’s tests
- [`./features`](#features), which contains code used to render individual pages of your application
- [`./server`](#server), which contains code used to render individual pages of your application
- [`./foundation`](#foundation), which contains global code used to render the overall HTML page

### `./shared/`

`shared` is a directory containing components and utilities that are used by many parts of your application. You are encouraged to group shared code by the broad "domain", and to try to limit your application to the smallest number of domains you reasonable can. Each domain can export all the code the rest of your app needs to operate on that domain — types, helper functions, constants, React components, and more are all good options.

By convention, each shared domain of your application is represented as a TypeScript file in the `shared` top-level directory. If it is a large domain, you may want to also add a directory with multiple source files, and re-export the domain from its TypeScript "index" file. The example below shows a `cart.ts` file that would export all shared utilities for a "cart" domain, with a nested directory containing the source files for this domain:

```
|-- shared/
|   |-- cart.ts
|   |-- cart/
|   |   |-- add-to-cart.ts
|   |   |-- add-to-cart.test.ts
|   |   |-- remove-from-cart.ts
|   |   |-- remove-from-cart.test.ts
|   |   |-- types.ts
|   |   |-- README.md
```

```ts
// Example `shared/cart.ts` content:

export * from './cart/types.ts';
export {addToCart} from './cart/add-to-cart.ts';
export {removeFromCart} from './cart/remove-from-cart.ts';
```

Files in this directory are available under a special `~/shared/` import path; so, you may export a collection of cart-related utilities from `./shared/cart.ts`, and would import it from anywhere in your application using the `~/shared/cart.ts` alias:

```ts
import {addToCart, type Cart} from '~/shared/cart.ts';
```

### `./tests/`

The tests directory is similar to `shared`, but is used to used for global test utilities for your application. You may choose to export test-related contents from `shared`, too, but the root `tests` directory is useful for code that is exclusively used in tests. Like `shared`, you are expected to include TypeScript files at the root of this directory that export each test-only domain, and each is accessible with a `~/tests/` import prefix.

The Quilt templates use this directory to export a `mount()` function that can be used to unit test React components with your app-level context provided:

```tsx
import {test, expect} from '@quilted/quilt/testing';
import {mount} from '~/tests/mount.ts';

function MyComponent() {
  return <div>Hello, world!</div>;
}

test('my component works!', async () => {
  const myComponent = await mount(<MyComponent />);
  expect(myComponent.text).toBe('Hello, world!');
});
```

### `./features/`

The `features` directory contains the one-off components and utilities that are used to render individual pages of your application. Most of the code that makes your application special will likely be in this directory.

Like `shared`, you are encouraged to group your features into the important domains that your application operates on, with each having a TypeScript file at the root of this directory. For example, you may group all of the pages in a storefront dedicated to rendering the product list and details into a single group, since they often share a lot of code and utilities. Also like `shared`, you should add a directory in `features` for each domain to contain multiple source and test files. The example below shows a structure you could use for a number of pages related to user accounts:

```
|-- features/
|   |-- accounts.ts
|   |-- accounts/
|   |   |-- AccountHome.tsx
|   |   |-- AccountHome.test.tsx
|   |   |-- LogIn.tsx
|   |   |-- LogIn.test.tsx
|   |   |-- Settings.tsx
|   |   |-- Settings.test.tsx
```

```tsx
// Example `features/accounts.ts` content:

import {createAsyncComponent} from '@quilted/quilt';

export const AccountHome = createAsyncComponent(
  () => import('./accounts/AccountHome.tsx'),
);

export const LogIn = createAsyncComponent(
  () => import('./accounts/LogIn.tsx'),
);

export const Settings = createAsyncComponent(
  () => import('./accounts/Settings.tsx'),
);
```

Unlike `shared`, not many files are expected to import from the `features` directory. Typically, only the "entry" files for your application, like `server.tsx`, `browser.tsx`, or `App.tsx`, are going to import from these files, in order to set up the pages and backend routes for your application.

### `./server/`

The `server` directory is intended to contain all the server-only code for your web application. Simple apps may exclude this directory entirely, but if you are using the [server-side rendering capability](./server.md) and adding custom routes, you will likely want to add this directory for clarity. There is no prescribed structure to this directory, but as [noted above](#entry-files), the `server.tsx` file is generally expected to be the entry point for your server-side rendering code. That entry file is typically going to be the only file importing directly from the `server` directory, so there is no special import alias for `server`.

### `./foundation/`

The `foundation` directory contains one-off components and utilities that are not related to any one page in your application. The default templates uses this directory to contain code that adds global `<head>` tags and HTTP headers. Because you are only expected to import this code in your app’s entrypoint, there is no special import alias for `foundation`.

## Common file names

TODO
