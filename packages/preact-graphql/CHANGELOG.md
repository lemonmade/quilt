# @quilted/preact-graphql

## 0.2.1

### Patch Changes

- [#966](https://github.com/lemonmade/quilt/pull/966) [`8143128`](https://github.com/lemonmade/quilt/commit/8143128d5e1282b9f81106c042f44d6429c6312a) Thanks [@lemonmade](https://github.com/lemonmade)! - Track the current `@quilted/graphql`

  `@quilted/preact-graphql` still pinned `@quilted/graphql` at `^3.4.1` (it wasn't co-released when `@quilted/graphql` reached 3.5.0), so consumers on graphql-js 17 could resolve its `@quilted/graphql` to the older graphql-16-only build and end up with two graphql copies. Bump the range to `^3.5.0` to match the rest of the workspace.

## 0.2.0

### Minor Changes

- [#964](https://github.com/lemonmade/quilt/pull/964) [`98aeb13`](https://github.com/lemonmade/quilt/commit/98aeb1312f0d13d0e7525bb9163aa2d43ee9fd9d) Thanks [@lemonmade](https://github.com/lemonmade)! - Declare a `graphql` peer dependency (`^16.8.0 || ^17.0.0`, optional)

  `@quilted/preact-graphql` depends on `@quilted/graphql` but didn't declare its own `graphql` peer, so a consumer adopting graphql-js 17 could end up with the package's `@quilted/graphql` deduped against an older graphql 16 copy — leaving two graphql versions in the tree and tripping graphql's nominal `TypedDocumentNode` type checks. Declaring the peer lets the consumer's graphql resolve a single copy.

## 0.1.12

### Patch Changes

- [#950](https://github.com/lemonmade/quilt/pull/950) [`2267309`](https://github.com/lemonmade/quilt/commit/226730924331208b252a128299f445f80150f9d3) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgraded the Preact and Hono dependency ecosystems to their current releases: preact 10.29.2, preact-render-to-string 6.7.0, @preact/signals 2.9, @preact/signals-core 1.14.2, @prefresh/vite 3, hono 4.12, and @hono/node-server 2. These are bumped together, and pinned to a single version tree-wide (via pnpm overrides), because mixing Preact copies crashes server rendering.

- Updated dependencies [[`2267309`](https://github.com/lemonmade/quilt/commit/226730924331208b252a128299f445f80150f9d3)]:
  - @quilted/preact-async@0.1.24
  - @quilted/preact-context@0.1.6
  - @quilted/preact-signals@0.1.6

## 0.1.11

### Patch Changes

- [`3e007b8`](https://github.com/lemonmade/quilt/commit/3e007b8d098667d8d934e9f950e22ab48590a69d) Thanks [@lemonmade](https://github.com/lemonmade)! - Make `Navigation.cache` and `GraphQLClient.cache` always-defined, guaranteed values.

  Previously, both `Navigation.cache` and `GraphQLClient.cache` were typed as potentially `undefined` — when caching was disabled via `{cache: false}`, the property was set to `undefined`. This forced consumers to null-check the cache everywhere it was used, even though the common case is for the cache to exist.

  Now, both properties are always defined. When caching is disabled, a no-op cache is used that satisfies the full interface but does not persist any data:

  - `RouterNavigationCache` gains a `disabled` option. When disabled, `match()` still computes route matches for the current call but does not cache them across calls. `serialize()` returns an empty array and `restore()` is a no-op.
  - `GraphQLCache` gains a `disabled` option. When disabled, `query()` and `create()` produce fresh, uncached `GraphQLQuery` instances (no deduplication). `serialize()` returns an empty array and `restore()` is a no-op.

  Both classes expose a public `disabled: boolean` property so consumers can check whether caching is active without needing separate state.

  **Breaking change:** `Navigation.cache` is now `RouterNavigationCache` (was `RouterNavigationCache | undefined`) and `GraphQLClient.cache` is now `GraphQLCache` (was `GraphQLCache | undefined`). Code that checked for `undefined` to detect disabled caching should use the `.disabled` property instead.

- Updated dependencies [[`3e007b8`](https://github.com/lemonmade/quilt/commit/3e007b8d098667d8d934e9f950e22ab48590a69d)]:
  - @quilted/graphql@3.4.1

## 0.1.10

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
  - @quilted/graphql@3.4.0
  - @quilted/preact-context@0.1.5
  - @quilted/preact-async@0.1.23

## 0.1.9

### Patch Changes

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

- Updated dependencies [[`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689)]:
  - @quilted/preact-context@0.1.4
  - @quilted/preact-signals@0.1.3
  - @quilted/preact-async@0.1.22
  - @quilted/graphql@3.3.10

## 0.1.8

### Patch Changes

- [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies

- Updated dependencies [[`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59)]:
  - @quilted/preact-context@0.1.3
  - @quilted/preact-signals@0.1.1
  - @quilted/preact-async@0.1.20

## 0.1.7

### Patch Changes

- [`cec3cc7`](https://github.com/lemonmade/quilt/commit/cec3cc7d89eaad21d12567413e53428bf31ec81a) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix excessive query creation

## 0.1.6

### Patch Changes

- [`8971aa1`](https://github.com/lemonmade/quilt/commit/8971aa1802ccaf8fb9edfb5a4227ab8f8be298b2) Thanks [@lemonmade](https://github.com/lemonmade)! - Key `useGraphQLQuery` calls using variables by default

- [`47b73db`](https://github.com/lemonmade/quilt/commit/47b73dbbc726efd09cccfb49d8a0620b9aff378a) Thanks [@lemonmade](https://github.com/lemonmade)! - Use a consistent name for serialized framework data

- Updated dependencies [[`47b73db`](https://github.com/lemonmade/quilt/commit/47b73dbbc726efd09cccfb49d8a0620b9aff378a)]:
  - @quilted/preact-async@0.1.18
  - @quilted/graphql@3.3.7

## 0.1.5

### Patch Changes

- [`9289032`](https://github.com/lemonmade/quilt/commit/92890322edb0dcfa2b27b8b36178e478433d6eca) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `useGraphQLQueryData` and `useGraphQLQueryRefetchOnMount` hooks

- Updated dependencies [[`ed8ade0`](https://github.com/lemonmade/quilt/commit/ed8ade071b579d3fb98d71437ffd0de580e26bc2)]:
  - @quilted/graphql@3.3.6

## 0.1.4

### Patch Changes

- [`299dfc4`](https://github.com/lemonmade/quilt/commit/299dfc4fae623e6b2bbf3ecb73f1d59bf44e13c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add missing `cached` option for GraphQL queries

- Updated dependencies [[`299dfc4`](https://github.com/lemonmade/quilt/commit/299dfc4fae623e6b2bbf3ecb73f1d59bf44e13c8)]:
  - @quilted/graphql@3.3.1

## 0.1.3

### Patch Changes

- [`ab9d73b`](https://github.com/lemonmade/quilt/commit/ab9d73bd56c4f43d207a9f01e4a7265b4f953a40) Thanks [@lemonmade](https://github.com/lemonmade)! - Add dedicated `GraphQLCache` class

- [`729163a`](https://github.com/lemonmade/quilt/commit/729163a3270a3dcfc6ae55511c31dbf1a46715ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Use `NoInfer` on GraphQL option types

- Updated dependencies [[`9a9667e`](https://github.com/lemonmade/quilt/commit/9a9667e6514215c9b851bfd426f470e0371c27a5), [`ab9d73b`](https://github.com/lemonmade/quilt/commit/ab9d73bd56c4f43d207a9f01e4a7265b4f953a40), [`729163a`](https://github.com/lemonmade/quilt/commit/729163a3270a3dcfc6ae55511c31dbf1a46715ca)]:
  - @quilted/preact-async@0.1.14
  - @quilted/graphql@3.2.0

## 0.1.2

### Patch Changes

- [`5e88a4f`](https://github.com/lemonmade/quilt/commit/5e88a4f46c9e335612b40a203f5a0f246ddd5ea6) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow keying a `GraphQLQuery`

- Updated dependencies [[`8c24286`](https://github.com/lemonmade/quilt/commit/8c24286a01a90c90987b9def81060b3537e52e77), [`a3ccf09`](https://github.com/lemonmade/quilt/commit/a3ccf09dd02620985a33d850dfa28d3e817a4b20)]:
  - @quilted/preact-async@0.1.11
  - @quilted/graphql@3.1.1

## 0.1.1

### Patch Changes

- [`58fea38`](https://github.com/lemonmade/quilt/commit/58fea38bbe5e999cb8742ac00cfaad04332507e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add hooks for GraphQL queries and mutations

- Updated dependencies [[`65b122d`](https://github.com/lemonmade/quilt/commit/65b122d90e297b425aa00f77dffc7bfb9b144aae), [`58fea38`](https://github.com/lemonmade/quilt/commit/58fea38bbe5e999cb8742ac00cfaad04332507e8)]:
  - @quilted/graphql@3.1.0
  - @quilted/preact-async@0.1.10
