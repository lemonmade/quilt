# @quilted/localize

## 0.2.5

### Patch Changes

- [`3f89dfc`](https://github.com/lemonmade/quilt/commit/3f89dfc4a020e02dee3b18c38967248c9d048b03) Thanks [@lemonmade](https://github.com/lemonmade)! - Add LRU cache for translations

## 0.2.4

### Patch Changes

- [`e98d39e`](https://github.com/lemonmade/quilt/commit/e98d39e4df24888c947cf2d0b711db2789d371a2) Thanks [@lemonmade](https://github.com/lemonmade)! - Added `Localization.translate()` method and new translation features.

  ## `Localization.translate()`

  The `Localization` class now accepts an optional `translations` dictionary in its constructor and exposes a `translate()` method:

  ```ts
  const localization = new Localization('en', {
    translations: {
      hello: 'Hello {name}',
      pages: {
        home: {title: 'Welcome home'},
      },
      message: {
        one: 'One message',
        other: '{count} messages',
      },
    },
  });

  localization.translate('hello', {name: 'world'}); // "Hello world"
  localization.translate('pages.home.title'); // "Welcome home"
  localization.translate('message', {count: 5}); // "5 messages"
  ```

  ## New `scope` option

  Prefix all keys with a namespace to avoid repeating common prefixes:

  ```ts
  localization.translate('title', {scope: 'pages.home'}); // resolves "pages.home.title"
  ```

  ## New `default` option

  Provide a fallback string instead of throwing on missing keys:

  ```ts
  localization.translate('missing.key', {default: 'Fallback'}); // "Fallback"
  localization.translate('missing.key', {
    default: 'Hello {name}',
    name: 'world',
  }); // "Hello world"
  ```

  ## New `ordinal` option

  Use `Intl.PluralRules` ordinal type for positional formatting (1st, 2nd, 3rd, etc.):

  ```ts
  const localization = new Localization('en', {
    translations: {
      place: {
        one: '{count}st',
        two: '{count}nd',
        few: '{count}rd',
        other: '{count}th',
      },
    },
  });

  localization.translate('place', {count: 1, ordinal: true}); // "1st"
  localization.translate('place', {count: 2, ordinal: true}); // "2nd"
  localization.translate('place', {count: 3, ordinal: true}); // "3rd"
  localization.translate('place', {count: 4, ordinal: true}); // "4th"
  ```

  ## New `MissingTranslationsError`

  A dedicated error class thrown when `translate()` is called on a `Localization` instance that was constructed without a `translations` dictionary.

  ## New `TranslateOptions` type

  Exported typed interface for the options object accepted by `translate()`, with `scope`, `default`, `ordinal`, and `count` as reserved keys alongside arbitrary placeholder replacements.

## 0.2.3

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

## 0.2.2

### Patch Changes

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

## 0.2.1

### Patch Changes

- [`05951a2`](https://github.com/lemonmade/quilt/commit/05951a2f1c6a7fb83207615c50703b502b21511e) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow string and bigints for number formatting

## 0.2.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

## 0.1.10

### Patch Changes

- [`1335ce47`](https://github.com/lemonmade/quilt/commit/1335ce47fb86ae628a421a22c22c794d94a307ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript

## 0.1.9

### Patch Changes

- [`6e999a5f`](https://github.com/lemonmade/quilt/commit/6e999a5f2b3001923fdb83d9954318742e3a84e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic translation function

## 0.1.8

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.1.7

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.1.6

### Patch Changes

- [#429](https://github.com/lemonmade/quilt/pull/429) [`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7) Thanks [@lemonmade](https://github.com/lemonmade)! - Update all development dependencies to their latest versions

## 0.1.5

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.1.4

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.1.3

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.1.2

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.1.1

### Patch Changes

- [#263](https://github.com/lemonmade/quilt/pull/263) [`6df853eb`](https://github.com/lemonmade/quilt/commit/6df853eb1e83abfa00e88b43e91b350da28d2704) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix localization formatting types

## 0.1.0

### Minor Changes

- [`b0040c72`](https://github.com/lemonmade/quilt/commit/b0040c7279931f426df5d7fac91a3a35ea49eae1) Thanks [@lemonmade](https://github.com/lemonmade)! - Initial localization packages
