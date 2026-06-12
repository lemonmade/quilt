# @quilted/preact-async

## 0.1.24

### Patch Changes

- [#950](https://github.com/lemonmade/quilt/pull/950) [`2267309`](https://github.com/lemonmade/quilt/commit/226730924331208b252a128299f445f80150f9d3) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgraded the Preact and Hono dependency ecosystems to their current releases: preact 10.29.2, preact-render-to-string 6.7.0, @preact/signals 2.9, @preact/signals-core 1.14.2, @prefresh/vite 3, hono 4.12, and @hono/node-server 2. These are bumped together, and pinned to a single version tree-wide (via pnpm overrides), because mixing Preact copies crashes server rendering.

- Updated dependencies [[`2267309`](https://github.com/lemonmade/quilt/commit/226730924331208b252a128299f445f80150f9d3)]:
  - @quilted/preact-browser@0.2.9
  - @quilted/preact-context@0.1.6
  - @quilted/preact-signals@0.1.6

## 0.1.23

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
  - @quilted/preact-browser@0.2.7
  - @quilted/preact-context@0.1.5

## 0.1.22

### Patch Changes

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

- Updated dependencies [[`b1df5da`](https://github.com/lemonmade/quilt/commit/b1df5daff8441f8435a62b02b4ad3676d3ddcc3b), [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689)]:
  - @quilted/preact-browser@0.2.6
  - @quilted/preact-context@0.1.4
  - @quilted/preact-signals@0.1.3

## 0.1.21

### Patch Changes

- Updated dependencies [[`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4)]:
  - @quilted/preact-browser@0.2.0

## 0.1.20

### Patch Changes

- [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies

- Updated dependencies [[`3fe12c7`](https://github.com/lemonmade/quilt/commit/3fe12c79055882debdbcacf44da90f99d82cfef1), [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59)]:
  - @quilted/preact-browser@0.1.15
  - @quilted/preact-context@0.1.3
  - @quilted/preact-signals@0.1.1

## 0.1.19

### Patch Changes

- [`e1f8fed`](https://github.com/lemonmade/quilt/commit/e1f8fedf436ee4eb1957a7559b0f78e742e494e7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `useAsync()` not re-rendering in some cases

## 0.1.18

### Patch Changes

- [`47b73db`](https://github.com/lemonmade/quilt/commit/47b73dbbc726efd09cccfb49d8a0620b9aff378a) Thanks [@lemonmade](https://github.com/lemonmade)! - Use a consistent name for serialized framework data

- Updated dependencies [[`3a20ff9`](https://github.com/lemonmade/quilt/commit/3a20ff9101119d07bad8ddfbf414be4d3833c3b1)]:
  - @quilted/async@0.4.21

## 0.1.17

### Patch Changes

- [`3728fa9`](https://github.com/lemonmade/quilt/commit/3728fa93e99bd75b456fe7c1a9c15b01ed2f05cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `AsyncComponent` when using context-driven render function

## 0.1.16

### Patch Changes

- [`1a64df9`](https://github.com/lemonmade/quilt/commit/1a64df909e1adecd154c0ff159ac87248bbf9364) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow global override of `AsyncComponent.render()`

## 0.1.15

### Patch Changes

- [`3fd4063`](https://github.com/lemonmade/quilt/commit/3fd4063700f6a099196255bf826270c820db4e48) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow customized wrapping of `AsyncComponent` content

## 0.1.14

### Patch Changes

- [`9a9667e`](https://github.com/lemonmade/quilt/commit/9a9667e6514215c9b851bfd426f470e0371c27a5) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `serialize` option to `AsyncContext` to make cache serialization optional

- Updated dependencies [[`7faeb6a`](https://github.com/lemonmade/quilt/commit/7faeb6a4152f072b7d25a0da7aa498af380b8227)]:
  - @quilted/async@0.4.15

## 0.1.13

### Patch Changes

- [`442f69a`](https://github.com/lemonmade/quilt/commit/442f69a701897aeef40cb1eb2460b0551e4586c9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add a count of active query watchers

- [`d58b911`](https://github.com/lemonmade/quilt/commit/d58b911dbe0fecccb46cfbbb152a874d114d2b16) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `useAsyncCacheControl()` hook to revalidate async actions

- Updated dependencies [[`442f69a`](https://github.com/lemonmade/quilt/commit/442f69a701897aeef40cb1eb2460b0551e4586c9), [`1d1e03a`](https://github.com/lemonmade/quilt/commit/1d1e03a07955a2312a29398382f66db87577fb6e)]:
  - @quilted/async@0.4.14

## 0.1.12

### Patch Changes

- [`df94c4d`](https://github.com/lemonmade/quilt/commit/df94c4dcd79a73c8d71ef11a7edb36b547f139a3) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix async timing issues and added `useAsyncRetry()`

- Updated dependencies [[`df94c4d`](https://github.com/lemonmade/quilt/commit/df94c4dcd79a73c8d71ef11a7edb36b547f139a3)]:
  - @quilted/async@0.4.13

## 0.1.11

### Patch Changes

- [`8c24286`](https://github.com/lemonmade/quilt/commit/8c24286a01a90c90987b9def81060b3537e52e77) Thanks [@lemonmade](https://github.com/lemonmade)! - Add method to check changes to `AsyncAction` input

- Updated dependencies [[`8c24286`](https://github.com/lemonmade/quilt/commit/8c24286a01a90c90987b9def81060b3537e52e77), [`8011209`](https://github.com/lemonmade/quilt/commit/8011209b6a424dd39876615edd9642746cd37026), [`a3ccf09`](https://github.com/lemonmade/quilt/commit/a3ccf09dd02620985a33d850dfa28d3e817a4b20)]:
  - @quilted/async@0.4.12
  - @quilted/preact-browser@0.1.4

## 0.1.10

### Patch Changes

- [`58fea38`](https://github.com/lemonmade/quilt/commit/58fea38bbe5e999cb8742ac00cfaad04332507e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add hooks for GraphQL queries and mutations

- Updated dependencies [[`58fea38`](https://github.com/lemonmade/quilt/commit/58fea38bbe5e999cb8742ac00cfaad04332507e8)]:
  - @quilted/async@0.4.11

## 0.1.9

### Patch Changes

- [`5db01f8`](https://github.com/lemonmade/quilt/commit/5db01f8a8dce398a8ab02e40dba2b1f63840faf1) Thanks [@lemonmade](https://github.com/lemonmade)! - More fixes to async timing and cancellation

- Updated dependencies [[`5db01f8`](https://github.com/lemonmade/quilt/commit/5db01f8a8dce398a8ab02e40dba2b1f63840faf1)]:
  - @quilted/async@0.4.10

## 0.1.8

### Patch Changes

- [`ffa4d65`](https://github.com/lemonmade/quilt/commit/ffa4d6526892cadde17c1512b11537c907563bc5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `useAsync()` reactivity to option changes

- [`76504f1`](https://github.com/lemonmade/quilt/commit/76504f1058a1bdcf037499c36e648eee7fb6bc9d) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename `AsyncFetch` to `AsyncAction` and add `useAsyncMutation`

- Updated dependencies [[`ffa4d65`](https://github.com/lemonmade/quilt/commit/ffa4d6526892cadde17c1512b11537c907563bc5), [`76504f1`](https://github.com/lemonmade/quilt/commit/76504f1058a1bdcf037499c36e648eee7fb6bc9d), [`51407f5`](https://github.com/lemonmade/quilt/commit/51407f5e3495d34a77b58ce897d850b8756cdfbe), [`f62bbaf`](https://github.com/lemonmade/quilt/commit/f62bbaf0017917101c8e48471fdde09202d60c61)]:
  - @quilted/async@0.4.9

## 0.1.7

### Patch Changes

- [`c63696d`](https://github.com/lemonmade/quilt/commit/c63696defa3ae1e260ff8f29255d695c3ffe6da9) Thanks [@lemonmade](https://github.com/lemonmade)! - Run `AsyncFetch` on input changes in `useAsync`

- Updated dependencies [[`e991b05`](https://github.com/lemonmade/quilt/commit/e991b05d98ded75993b6b777fa715737af106220)]:
  - @quilted/async@0.4.8

## 0.1.6

### Patch Changes

- [`5ab45f2`](https://github.com/lemonmade/quilt/commit/5ab45f2650adc6278b4fba464b78445f753eea9e) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename `AsyncFetch.call()` to `AsyncFetch.fetch()`

- Updated dependencies [[`70b457c`](https://github.com/lemonmade/quilt/commit/70b457cc889e7fcb70d7ec397800b249dcc8a51f), [`5ab45f2`](https://github.com/lemonmade/quilt/commit/5ab45f2650adc6278b4fba464b78445f753eea9e), [`518de8a`](https://github.com/lemonmade/quilt/commit/518de8afb223d8b6c28294a2e28f3b042ae953a6), [`ed9ecdd`](https://github.com/lemonmade/quilt/commit/ed9ecdd8fa28d9c0505cb108c0c20fbe21968817), [`762ac2d`](https://github.com/lemonmade/quilt/commit/762ac2d94c7390149d1c60d8d40a7352532cdaa4)]:
  - @quilted/async@0.4.7
  - @quilted/preact-browser@0.1.3

## 0.1.5

### Patch Changes

- [`31e1775`](https://github.com/lemonmade/quilt/commit/31e1775f06e6be1ecdb9da53ba27f5528ba327d1) Thanks [@lemonmade](https://github.com/lemonmade)! - More async API type fixes

- Updated dependencies [[`31e1775`](https://github.com/lemonmade/quilt/commit/31e1775f06e6be1ecdb9da53ba27f5528ba327d1)]:
  - @quilted/async@0.4.6

## 0.1.4

### Patch Changes

- [`c813ecc`](https://github.com/lemonmade/quilt/commit/c813ecc6abe867849d3787e84fd284b731db3402) Thanks [@lemonmade](https://github.com/lemonmade)! - More async fetch improvements

- Updated dependencies [[`c813ecc`](https://github.com/lemonmade/quilt/commit/c813ecc6abe867849d3787e84fd284b731db3402), [`36b52ad`](https://github.com/lemonmade/quilt/commit/36b52ad6ea0dd4f9fb56110315e884a434c499f0)]:
  - @quilted/async@0.4.5

## 0.1.3

### Patch Changes

- [`28dd615`](https://github.com/lemonmade/quilt/commit/28dd615c944426e34a3649c61b554e0ba1a66da1) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve `AsyncFetch` state management

- Updated dependencies [[`28dd615`](https://github.com/lemonmade/quilt/commit/28dd615c944426e34a3649c61b554e0ba1a66da1)]:
  - @quilted/async@0.4.4

## 0.1.2

### Patch Changes

- [#732](https://github.com/lemonmade/quilt/pull/732) [`5d5b90b`](https://github.com/lemonmade/quilt/commit/5d5b90bd62d887ec90198702e81696fa93555281) Thanks [@lemonmade](https://github.com/lemonmade)! - Introduce a more powerful `AsyncFetch` primitive, `AsyncFetchCache` for caching results, and `useAsync` hook for component-level data fetching.

- Updated dependencies [[`5d5b90b`](https://github.com/lemonmade/quilt/commit/5d5b90bd62d887ec90198702e81696fa93555281)]:
  - @quilted/async@0.4.2

## 0.1.1

### Patch Changes

- [`88ed78c`](https://github.com/lemonmade/quilt/commit/88ed78cf98d5ddb33f466771c529a91d5c350905) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow `null` for loading content in async components
