# @quilted/preact-router

## 0.2.18

### Patch Changes

- [`3e007b8`](https://github.com/lemonmade/quilt/commit/3e007b8d098667d8d934e9f950e22ab48590a69d) Thanks [@lemonmade](https://github.com/lemonmade)! - Make `Navigation.cache` and `GraphQLClient.cache` always-defined, guaranteed values.

  Previously, both `Navigation.cache` and `GraphQLClient.cache` were typed as potentially `undefined` — when caching was disabled via `{cache: false}`, the property was set to `undefined`. This forced consumers to null-check the cache everywhere it was used, even though the common case is for the cache to exist.

  Now, both properties are always defined. When caching is disabled, a no-op cache is used that satisfies the full interface but does not persist any data:

  - `RouterNavigationCache` gains a `disabled` option. When disabled, `match()` still computes route matches for the current call but does not cache them across calls. `serialize()` returns an empty array and `restore()` is a no-op.
  - `GraphQLCache` gains a `disabled` option. When disabled, `query()` and `create()` produce fresh, uncached `GraphQLQuery` instances (no deduplication). `serialize()` returns an empty array and `restore()` is a no-op.

  Both classes expose a public `disabled: boolean` property so consumers can check whether caching is active without needing separate state.

  **Breaking change:** `Navigation.cache` is now `RouterNavigationCache` (was `RouterNavigationCache | undefined`) and `GraphQLClient.cache` is now `GraphQLCache` (was `GraphQLCache | undefined`). Code that checked for `undefined` to detect disabled caching should use the `.disabled` property instead.

## 0.2.17

### Patch Changes

- [`8cc966f`](https://github.com/lemonmade/quilt/commit/8cc966f4a3e178860d1fc62b3c3cef19505660e6) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing navigation cache entries on init

## 0.2.16

### Patch Changes

- [#894](https://github.com/lemonmade/quilt/pull/894) [`fb998d1`](https://github.com/lemonmade/quilt/commit/fb998d1d0a7fb7981184daa5307320477355ace8) Thanks [@lemonmade](https://github.com/lemonmade)! - Consolidate all framework context into a unified `QuiltContext` architecture.

  Previously, Quilt's context was fragmented across many standalone provider components (`AsyncContext`, `GraphQLContext`, `EmailContext`, etc.), each backed by its own Preact context object. This release consolidates everything into a single `QuiltContext` interface, augmented by each package via TypeScript module declaration merging, and provided by a single `<QuiltFrameworkContext>` component.

  ## Breaking changes

  ### All packages: unified `QuiltContext` interface

  Each `@quilted/*` package now augments a single `QuiltContext` interface from `@quilted/preact-context` rather than maintaining its own standalone context. If you were accessing any Quilt context values directly via `useContext(SomeSpecificContext)`, switch to the appropriate `use*` hook instead.

  ### `@quilted/preact-router`: `useRouter` renamed to `useNavigation`

  ```ts
  // Before
  import {useRouter} from '@quilted/quilt/navigation';
  const router = useRouter();

  // After
  import {useNavigation} from '@quilted/quilt/navigation';
  const navigation = useNavigation();
  ```

  ### `@quilted/preact-router`: `router` QuiltContext field renamed to `navigation`

  The `QuiltContext` field that holds the navigation instance is now `navigation` instead of `router`. This affects any code that reads the field directly, and the prop name on `<QuiltFrameworkContext>`.

  ```tsx
  // Before
  <QuiltFrameworkContext router={myNavigation} />

  // After
  <QuiltFrameworkContext navigation={myNavigation} />
  ```

  ### `@quilted/preact-router`: `TestRouter` renamed to `TestNavigation`

  ```ts
  // Before
  import {TestRouter} from '@quilted/quilt/navigation/testing';

  // After
  import {TestNavigation} from '@quilted/quilt/navigation/testing';
  ```

  ### `@quilted/preact-browser`: `browserDetails` and `browserAssets` QuiltContext fields renamed

  The `QuiltContext` fields for browser environment details and the asset manifest have shorter, cleaner names:

  - `browserDetails` → `browser`
  - `browserAssets` → `assets`

  These affect the props on `<QuiltFrameworkContext>` and any direct reads of the context.

  ```tsx
  // Before
  <QuiltFrameworkContext browserDetails={browser} browserAssets={assets} />

  // After
  <QuiltFrameworkContext browser={browser} assets={assets} />
  ```

  ### `@quilted/preact-localize`: `localize` QuiltContext field renamed to `localization`

  The QuiltContext field and the corresponding `<QuiltFrameworkContext>` prop are now `localization`:

  ```tsx
  // Before
  <QuiltFrameworkContext localize={localization} />

  // After
  <QuiltFrameworkContext localization={localization} />
  ```

  ### `@quilted/preact-localize`: `createLocalizedFormatting` and `createLocalization` removed

  These factory functions have been removed. Use the `Localization` class directly:

  ```ts
  // Before
  import {createLocalization} from '@quilted/preact-localize';
  const localization = createLocalization('en');

  // After
  import {Localization} from '@quilted/preact-localize';
  const localization = new Localization('en');
  ```

  ### `@quilted/preact-async`: `AsyncContext` component removed

  The standalone `<AsyncContext>` provider component has been removed. Pass async context directly to `<QuiltFrameworkContext>` instead:

  ```tsx
  // Before
  import {AsyncContext, AsyncActionCache} from '@quilted/quilt/async';

  <AsyncContext cache={cache}>
    <App />
  </AsyncContext>;

  // After
  import {QuiltFrameworkContext} from '@quilted/quilt/context';
  import {AsyncActionCache} from '@quilted/quilt/async';

  <QuiltFrameworkContext async={{cache}}>
    <App />
  </QuiltFrameworkContext>;
  ```

  `QuiltFrameworkContext` handles cache serialization for server-side rendering automatically, so no other changes are required.

  ### `@quilted/preact-graphql`: `GraphQLContext` component removed

  The standalone `<GraphQLContext>` provider component has been removed. The two separate `graphqlRun` and `graphqlCache` props on `<QuiltFrameworkContext>` have been replaced with a single `graphql` prop that accepts a `GraphQLClient` instance (or any object with `fetch` and `cache` properties):

  ```tsx
  // Before
  import {GraphQLContext} from '@quilted/quilt/graphql';

  <QuiltFrameworkContext navigation={navigation}>
    <GraphQLContext fetch={myFetch} cache={myCache}>
      <App />
    </GraphQLContext>
  </QuiltFrameworkContext>;

  // After — using the new GraphQLClient class
  import {GraphQLClient} from '@quilted/quilt/graphql';

  const graphql = new GraphQLClient(myFetch);

  <QuiltFrameworkContext navigation={navigation} graphql={graphql}>
    <App />
  </QuiltFrameworkContext>;
  ```

  ### `@quilted/preact-email`: `EmailContext` removed

  The standalone `EmailContext` Preact context object has been removed. Email components should use the new `useEmailManager()` hook to access the email manager, which reads from the unified `QuiltContext`:

  ```ts
  // Before
  import {useContext} from 'preact/hooks';
  import {EmailContext} from '@quilted/preact-email';
  const email = useContext(EmailContext);

  // After
  import {useEmailManager} from '@quilted/preact-email';
  const email = useEmailManager();
  ```

  ### `@quilted/quilt`: `QuiltContext` component renamed to `QuiltFrameworkContext`

  The provider component is now named `QuiltFrameworkContext` to avoid a name clash with the `QuiltContext` TypeScript interface:

  ```tsx
  // Before
  import {QuiltContext} from '@quilted/quilt/context';
  <QuiltContext navigation={navigation}>...</QuiltContext>;

  // After
  import {QuiltFrameworkContext} from '@quilted/quilt/context';
  <QuiltFrameworkContext navigation={navigation}>...</QuiltFrameworkContext>;
  ```

  ### `@quilted/quilt`: `QuiltTestContext` renamed to `QuiltFrameworkTestContext`, takes `localization` instead of `locale`

  The test context helper component is now `QuiltFrameworkTestContext` and accepts a `Localization` instance directly instead of a locale string:

  ```tsx
  // Before
  import {QuiltTestContext} from '@quilted/quilt/context/testing';
  <QuiltTestContext locale="fr">...</QuiltTestContext>;

  // After
  import {QuiltFrameworkTestContext} from '@quilted/quilt/context/testing';
  import {Localization} from '@quilted/quilt/localize';
  <QuiltFrameworkTestContext localization={new Localization('fr')}>
    ...
  </QuiltFrameworkTestContext>;
  ```

  ## New features

  ### `@quilted/graphql`: `GraphQLClient` class

  A new `GraphQLClient` class bundles a GraphQL fetch function and an optional result cache into a single object. A cache is created automatically by default, configured to use the same fetch function:

  ```ts
  import {createGraphQLFetch, GraphQLClient} from '@quilted/quilt/graphql';

  // Cache created automatically from the fetch function
  const client = new GraphQLClient(createGraphQLFetch({url: '/graphql'}));

  // Disable caching
  const client = new GraphQLClient(myFetch, {cache: false});

  // Share an existing cache
  const cache = new GraphQLCache();
  const client = new GraphQLClient(myFetch, {cache});

  // Use the client
  client.fetch(MyQuery, {variables: {id: '1'}});
  client.cache?.query(MyQuery, {variables: {id: '1'}});
  ```

  ### `@quilted/preact-router`: `useNavigation()` hook

  The renamed `useNavigation()` hook returns the active `Navigation` instance from context, providing access to the current URL, navigation history, and programmatic navigation.

  ### `@quilted/preact-email`: `useEmailManager()` hook

  A new `useEmailManager()` hook provides access to the `EmailManager` instance from the unified `QuiltContext`. Returns `undefined` outside of an email rendering context.

  ### `@quilted/preact-async`: signal-backed `async.isHydrated`

  The `AsyncContext` interface (accessed via `useQuiltContext('async')`) now includes an `isHydrated` boolean getter backed by a Preact signal. Any component that reads `async.isHydrated` will automatically re-render when the client hydration completes, without requiring a manual signal subscription.

  ### `@quilted/localize`: `Localization` class documentation

  The `Localization` class now has full JSDoc documentation on the class, constructor, all properties (`locale`, `direction`, `numberFormatter`, `dateTimeFormatter`), and all methods (`formatNumber`, `formatCurrency`, `formatDate`).

- Updated dependencies [[`fb998d1`](https://github.com/lemonmade/quilt/commit/fb998d1d0a7fb7981184daa5307320477355ace8)]:
  - @quilted/preact-performance@0.1.3
  - @quilted/preact-browser@0.2.7
  - @quilted/preact-context@0.1.5
  - @quilted/preact-async@0.1.23

## 0.2.15

### Patch Changes

- [`06b43bc`](https://github.com/lemonmade/quilt/commit/06b43bc44d271ce30798dc0b582870208bae1572) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix anchor type for Link component

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

- Updated dependencies [[`b1df5da`](https://github.com/lemonmade/quilt/commit/b1df5daff8441f8435a62b02b4ad3676d3ddcc3b), [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689)]:
  - @quilted/preact-browser@0.2.6
  - @quilted/preact-performance@0.1.2
  - @quilted/preact-context@0.1.4
  - @quilted/preact-async@0.1.22
  - @quilted/signals@0.2.4

## 0.2.14

### Patch Changes

- [`9200a33`](https://github.com/lemonmade/quilt/commit/9200a33286119f0917766cde4a40b15af1b18f2b) Thanks [@lemonmade](https://github.com/lemonmade)! - Don't suspend entire route tree when any matching route entry is loading

## 0.2.13

### Patch Changes

- Updated dependencies [[`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4)]:
  - @quilted/preact-browser@0.2.0
  - @quilted/preact-async@0.1.21

## 0.2.12

### Patch Changes

- [`3fe12c7`](https://github.com/lemonmade/quilt/commit/3fe12c79055882debdbcacf44da90f99d82cfef1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixes for modern types

- [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies

- Updated dependencies [[`3fe12c7`](https://github.com/lemonmade/quilt/commit/3fe12c79055882debdbcacf44da90f99d82cfef1), [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59)]:
  - @quilted/preact-browser@0.1.15
  - @quilted/preact-performance@0.1.1
  - @quilted/preact-context@0.1.3
  - @quilted/preact-async@0.1.20

## 0.2.11

### Patch Changes

- [`47b73db`](https://github.com/lemonmade/quilt/commit/47b73dbbc726efd09cccfb49d8a0620b9aff378a) Thanks [@lemonmade](https://github.com/lemonmade)! - Use a consistent name for serialized framework data

- Updated dependencies [[`3a20ff9`](https://github.com/lemonmade/quilt/commit/3a20ff9101119d07bad8ddfbf414be4d3833c3b1), [`47b73db`](https://github.com/lemonmade/quilt/commit/47b73dbbc726efd09cccfb49d8a0620b9aff378a)]:
  - @quilted/async@0.4.21
  - @quilted/preact-async@0.1.18

## 0.2.10

### Patch Changes

- [#822](https://github.com/lemonmade/quilt/pull/822) [`8c31b11`](https://github.com/lemonmade/quilt/commit/8c31b117cdcc8986bbf2fffd5c22f7966c90d2cc) Thanks [@lemonmade](https://github.com/lemonmade)! - Add back support for router redirects

- [`b5a777a`](https://github.com/lemonmade/quilt/commit/b5a777a29405429a45c9e44e0ddc4835441e9bb1) Thanks [@lemonmade](https://github.com/lemonmade)! - Export base navigation and route types from Preact router package

## 0.2.9

### Patch Changes

- [`d91c56d`](https://github.com/lemonmade/quilt/commit/d91c56d282c82b33e646125a07cd101d1678770e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix rendering of nested fallback routes

## 0.2.8

### Patch Changes

- [`78ff84a`](https://github.com/lemonmade/quilt/commit/78ff84a34d47eecc3d1354a9926204477771dbe8) Thanks [@lemonmade](https://github.com/lemonmade)! - Expose raw router context objects

## 0.2.7

### Patch Changes

- [`a877673`](https://github.com/lemonmade/quilt/commit/a877673630abdb25e93b7e38715d0e2550fee4ba) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow `Link` to render without a router

- Updated dependencies [[`3fd4063`](https://github.com/lemonmade/quilt/commit/3fd4063700f6a099196255bf826270c820db4e48)]:
  - @quilted/preact-async@0.1.15

## 0.2.6

### Patch Changes

- [`5fe9550`](https://github.com/lemonmade/quilt/commit/5fe955005179d1734201d9a91e191d21f6f187d8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix relative route resolution with custom base URLs

- Updated dependencies [[`5fe9550`](https://github.com/lemonmade/quilt/commit/5fe955005179d1734201d9a91e191d21f6f187d8)]:
  - @quilted/routing@0.4.2

## 0.2.5

### Patch Changes

- [`5c418c3`](https://github.com/lemonmade/quilt/commit/5c418c3a9a7de7c5ee4337cbd02b68e4bcd2d581) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `createContextRouteFunction()` helper for creating routes with a known context, and use it for app context

## 0.2.4

### Patch Changes

- [`f369ee1`](https://github.com/lemonmade/quilt/commit/f369ee19ae64eed556a1385514d26278540133b1) Thanks [@lemonmade](https://github.com/lemonmade)! - Expose explicit types for route loaders

- [`da6376b`](https://github.com/lemonmade/quilt/commit/da6376beca8256d525f0552bf310326dd94b62e4) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix broken back/forward handling

## 0.2.3

### Patch Changes

- [`d2f497d`](https://github.com/lemonmade/quilt/commit/d2f497dc37c987607f75fd5e8aeaa6ffd922ff77) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve router IDs and keys

## 0.2.2

### Patch Changes

- [`2b7ccd2`](https://github.com/lemonmade/quilt/commit/2b7ccd2fd23c827db3b167585262071cd51c868c) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix incorrect typings in preact-router package

- Updated dependencies [[`858db16`](https://github.com/lemonmade/quilt/commit/858db164ea8d1d84d2cf112797405840deb0f4f2)]:
  - @quilted/async@0.4.17

## 0.2.1

### Patch Changes

- [#760](https://github.com/lemonmade/quilt/pull/760) [`8cea8b6`](https://github.com/lemonmade/quilt/commit/8cea8b67158b4aab6b7fc30f1dc8efbddd00e143) Thanks [@lemonmade](https://github.com/lemonmade)! - Serialize navigation load results

## 0.2.0

### Minor Changes

- [#757](https://github.com/lemonmade/quilt/pull/757) [`00cac4b`](https://github.com/lemonmade/quilt/commit/00cac4b4d01831ba654e94152d7a67a0ef75043b) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify routing library

### Patch Changes

- Updated dependencies [[`00cac4b`](https://github.com/lemonmade/quilt/commit/00cac4b4d01831ba654e94152d7a67a0ef75043b)]:
  - @quilted/routing@0.4.0
