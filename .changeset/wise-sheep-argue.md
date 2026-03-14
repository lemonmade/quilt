---
'@quilted/graphql': minor
'@quilted/preact-performance': patch
'@quilted/preact-localize': patch
'@quilted/preact-browser': patch
'@quilted/preact-context': patch
'@quilted/preact-graphql': patch
'@quilted/preact-router': patch
'@quilted/preact-async': patch
'@quilted/preact-email': patch
'@quilted/localize': patch
'@quilted/browser': patch
'@quilted/create': patch
'@quilted/quilt': patch
---

Consolidate all framework context into a unified `QuiltContext` architecture.

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
