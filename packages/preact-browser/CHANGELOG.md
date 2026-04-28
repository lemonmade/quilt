# @quilted/preact-browser

## 0.2.8

### Patch Changes

- [#922](https://github.com/lemonmade/quilt/pull/922) [`297c540`](https://github.com/lemonmade/quilt/commit/297c5401bda5e6d37a9d64037b7dd5fe4651cb30) Thanks [@lemonmade](https://github.com/lemonmade)! - Move `HTMLTemplate` serializations and asset placeholders into `<head>` by default

  `HTMLTemplate.Body` previously rendered the `<HTMLTemplate.Serializations />` and `<HTMLTemplate.Assets />` placeholders directly inside `<body>`, ahead of the app content. That layout produced a Safari-specific flash of unstyled content on initial paint: body-positioned `<link rel=stylesheet>` (even with `blocking="render"`) didn't reliably stop the parser from committing the body content that preceded them.

  The default placement is now:

  - `HTMLTemplate.Head` renders title/links/metas, then `<HTMLTemplate.Serializations />`, then the three `<HTMLTemplate.Assets />` placeholders (entry, async, preload) — same order `HTMLTemplate.Body` used to use.
  - `HTMLTemplate.Body` renders only the wrapper + `<HTMLTemplate.Content />`.

  Stylesheet links land in `<head>`, where they block initial render the standards-correct way; `Link: rel=preload` HTTP headers and the in-document `<link>` tags now consistently target the same location, so the preload scanner picks the same URLs both ways.

  Apps that already pass a custom `head={…}` or `body={…}` to `HTMLTemplate` aren't affected — the change is in the default content of `HTMLTemplateHead` / `HTMLTemplateBody`, which only takes effect when the `children` prop on those components isn't provided.

  `<Serialization>` now renders as `<script type="quilt/serialization" data-name=...>JSON</script>` instead of `<browser-serialization name=... content=...>`. The script form is required for the head positioning above: `<browser-serialization>` is unknown to the HTML parser, which treats it as flow content; encountering one in `<head>` would close `<head>` and start `<body>`, dragging the asset placeholders out of the head with it. The script form is parser-safe in both head and body, doesn't execute (the type isn't a recognized JS MIME), and the JSON payload escapes "<" to its unicode form so a `</script>` inside a serialized value can't terminate the tag. The client-side reader (`BrowserSerializations`) was updated to match; the legacy `BrowserSerializationElement` custom-element class still works for anyone defining it programmatically (the read path falls back to its `name` / `content` attributes).

- Updated dependencies [[`297c540`](https://github.com/lemonmade/quilt/commit/297c5401bda5e6d37a9d64037b7dd5fe4651cb30)]:
  - @quilted/browser@0.2.5

## 0.2.7

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
  - @quilted/preact-context@0.1.5
  - @quilted/browser@0.2.4

## 0.2.6

### Patch Changes

- [`b1df5da`](https://github.com/lemonmade/quilt/commit/b1df5daff8441f8435a62b02b4ad3676d3ddcc3b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix shared CSS dependency loading in server rendered page

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

- Updated dependencies [[`b1df5da`](https://github.com/lemonmade/quilt/commit/b1df5daff8441f8435a62b02b4ad3676d3ddcc3b), [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689)]:
  - @quilted/assets@0.1.11
  - @quilted/preact-context@0.1.4
  - @quilted/browser@0.2.3
  - @quilted/signals@0.2.4

## 0.2.5

### Patch Changes

- [#890](https://github.com/lemonmade/quilt/pull/890) [`b0f2334`](https://github.com/lemonmade/quilt/commit/b0f23340945280c951998bf77b3be8b8df13338c) Thanks [@lemonmade](https://github.com/lemonmade)! - Redesign asset loading APIs for better performance and clearer structure.

  ## Breaking changes

  ### `@quilted/assets`: `BrowserAssetsEntry` redesigned

  The `BrowserAssetsEntry` type has been completely restructured. The previous flat `scripts` and `styles` arrays have been replaced with structured `script` and `style` objects that separate the entry asset from its dependencies:

  ```ts
  // Before
  interface BrowserAssetsEntry {
    scripts: Asset[];
    styles: Asset[];
  }

  // After
  interface BrowserAssetsEntry {
    script?: {
      asset: Asset;
      syncDependencies: readonly Asset[];
      asyncDependencies: readonly Asset[];
    };
    style?: {
      asset: Asset;
      syncDependencies: readonly Asset[];
      asyncDependencies: readonly Asset[];
    };
  }
  ```

  This separation enables the renderer to treat the entry script, its preloadable sync dependencies, and its async dependencies differently in the HTML output.

  ### `@quilted/assets`: `BrowserAssets.modules()` return type changed

  `modules()` now returns `readonly BrowserAssetsEntry[]` (one entry per module ID) instead of a single merged `BrowserAssetsEntry`:

  ```ts
  // Before
  modules(modules: Iterable<...>, options?): BrowserAssetsEntry;

  // After
  modules(modules: Iterable<string>, options?): readonly BrowserAssetsEntry[];
  ```

  ### `@quilted/assets`: `BrowserAssetModuleSelector` removed

  The `BrowserAssetModuleSelector` interface and the `modules` field on `BrowserAssetSelector` have been removed. If you want to get the asset details for modules in addition to the entrypoints, use `BrowserAssets.modules()` instead.

  ### `@quilted/assets`: `AssetBuildManifest` module entry format changed

  `AssetBuildManifest.modules` values changed from `number[]` to the new `AssetBuildModuleEntry` tuple type. The tuple uses positional slots for each asset category and is serialized in JSON as an object with numeric string keys (omitting empty positions):

  ```ts
  type AssetBuildModuleEntry = [
    script?: number, // [0] entry JS chunk
    style?: number, // [1] entry CSS file
    scriptSync?: number[], // [2] sync JS dependency indices
    styleSync?: number[], // [3] CSS from sync JS dependencies
    scriptAsync?: number[], // [4] dynamic JS dependency indices
    styleAsync?: number[], // [5] CSS from dynamic JS dependencies
  ];
  ```

  ### `@quilted/browser`: `BrowserResponseAssets.get()` return type changed

  `get()` now returns `string[]` (module IDs) instead of `BrowserAssetModuleSelector[]`.

  ## New features

  ### `@quilted/preact-browser`: `BrowserApp` class

  A new `BrowserApp` class simplifies constructing and running a browser app. It handles waiting for the `#app` DOM element via `MutationObserver`, which is necessary now that the entry script runs with the `async` attribute:

  ```ts
  import {BrowserApp} from '@quilted/quilt/browser';
  import {BrowserAppContext} from '~/context/browser.ts';
  import {App} from './App.tsx';

  const context = new BrowserAppContext();
  const app = new BrowserApp(<App context={context} />, {context});
  await app.hydrate();
  ```

  ## Render behavior changes

  ### Entry script rendered as `async` module

  The browser entry script is now rendered as `<script type="module" async>` instead of a blocking `<script type="module">`. This means the script no longer blocks HTML parsing, and does not wait for DOMContentLoaded. This change is meant to allow streaming HTML responses to begin executing JavaScript earlier.

  ### Sync dependencies rendered as `modulepreload` links

  Sync JS dependencies (previously rendered as additional `<script type="module">` tags) are now rendered as `<link rel="modulepreload">` hints. This tells the browser to fetch them eagerly without executing them, since the entry script will import them when it runs.

  ### Stylesheets rendered after all script references

  Entry and async stylesheets are now emitted from the `<HTMLTemplate.Assets async />` placeholder, after all script and modulepreload tags. This ensures the stylesheet `<link>` elements appear after all JS references in the HTML.

  ### Asset deduplication across streamed chunks

  Asset deduplication (preventing the same `src`/`href` from appearing more than once) now works across all streamed HTML chunks within a single response, not just within a single placeholder.

- Updated dependencies [[`b0f2334`](https://github.com/lemonmade/quilt/commit/b0f23340945280c951998bf77b3be8b8df13338c)]:
  - @quilted/assets@0.1.10
  - @quilted/browser@0.2.2

## 0.2.4

### Patch Changes

- [`33e97a4`](https://github.com/lemonmade/quilt/commit/33e97a4e72341c8aedfbb0a1f54ba5221ea9f560) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix flash of unstyled content (FOUC) for async components

  Async and preload asset placeholders are now rendered before the app content placeholder in the default `HTMLTemplateBody`. A pre-pass in the chunk renderer eagerly renders the app first so `browser.assets` is fully populated when the asset placeholders are processed. This ensures async component stylesheets are included in the HTML before the app content, preventing FOUC when streaming.

  Async component scripts are now rendered as `modulepreload` link tags rather than blocking script tags.

## 0.2.3

### Patch Changes

- [`31c4952`](https://github.com/lemonmade/quilt/commit/31c4952f9c4efa84fb443edd346c373d0830d951) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing server noop for OpenGraph component

- Updated dependencies [[`88d10ef`](https://github.com/lemonmade/quilt/commit/88d10ef57f6805d44325f5dd05687862c619cc55)]:
  - @quilted/browser@0.2.1

## 0.2.2

### Patch Changes

- [`94df293`](https://github.com/lemonmade/quilt/commit/94df293a1987784b02a742e316730cd96f8dc5fb) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix types for HTMLTemplate.links/metas

- [#879](https://github.com/lemonmade/quilt/pull/879) [`46af050`](https://github.com/lemonmade/quilt/commit/46af050759eb1113e97b1f1aeca1e76a7dde7af9) Thanks [@lemonmade](https://github.com/lemonmade)! - More HTML template and asset inlining improvements

## 0.2.1

### Patch Changes

- [#876](https://github.com/lemonmade/quilt/pull/876) [`d5db136`](https://github.com/lemonmade/quilt/commit/d5db13655ed8887f50f344c083914826247f4b59) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve API for HTML templates

## 0.2.0

### Minor Changes

- [#872](https://github.com/lemonmade/quilt/pull/872) [`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Replace @quilted/request-router with Hono

### Patch Changes

- Updated dependencies [[`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4), [`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4)]:
  - @quilted/browser@0.2.0

## 0.1.17

### Patch Changes

- [`64fc42b`](https://github.com/lemonmade/quilt/commit/64fc42b87ca72eec8dfab211d2ddecdbbaa0e4ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Transition browser header helpers to use classes

- Updated dependencies [[`64fc42b`](https://github.com/lemonmade/quilt/commit/64fc42b87ca72eec8dfab211d2ddecdbbaa0e4ac)]:
  - @quilted/browser@0.1.12

## 0.1.16

### Patch Changes

- [`f098594`](https://github.com/lemonmade/quilt/commit/f0985948408fa592773548d201bf9bc7e2bcdeda) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signal dependencies

- Updated dependencies [[`0312ff0`](https://github.com/lemonmade/quilt/commit/0312ff034b94605abc80c5b343a49c688c0ba618), [`f098594`](https://github.com/lemonmade/quilt/commit/f0985948408fa592773548d201bf9bc7e2bcdeda), [`a2f9cbd`](https://github.com/lemonmade/quilt/commit/a2f9cbdee1f81b1fbc32d832c96511a194084a4b)]:
  - @quilted/assets@0.1.9
  - @quilted/signals@0.2.3
  - @quilted/request-router@0.3.2

## 0.1.15

### Patch Changes

- [`3fe12c7`](https://github.com/lemonmade/quilt/commit/3fe12c79055882debdbcacf44da90f99d82cfef1) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixes for modern types

- [`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies

- Updated dependencies [[`96016f1`](https://github.com/lemonmade/quilt/commit/96016f1102276bdae3ef4ff0fae7656c9f118d59)]:
  - @quilted/preact-context@0.1.3

## 0.1.14

### Patch Changes

- [`33cf6c8`](https://github.com/lemonmade/quilt/commit/33cf6c87e899b54865fe6f1d82b5dab469e7a5fe) Thanks [@lemonmade](https://github.com/lemonmade)! - Move headers to be server-only in default templates

- [`c421ad9`](https://github.com/lemonmade/quilt/commit/c421ad92ce5554d2b6b9c0b44f24378759dce5ab) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow additional entries to be marked as inlined to include their content in the browser asset manifest

- Updated dependencies [[`33cf6c8`](https://github.com/lemonmade/quilt/commit/33cf6c87e899b54865fe6f1d82b5dab469e7a5fe), [`c421ad9`](https://github.com/lemonmade/quilt/commit/c421ad92ce5554d2b6b9c0b44f24378759dce5ab)]:
  - @quilted/browser@0.1.10
  - @quilted/assets@0.1.8

## 0.1.13

### Patch Changes

- [`48bd66e`](https://github.com/lemonmade/quilt/commit/48bd66e75923efcb76ce7096db75f5337e1952e7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some server render bugs

- [`820715f`](https://github.com/lemonmade/quilt/commit/820715f4801c936297d6ea57295b67af28917915) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename `ResponseStreamBoundary` to `HTMLStreamBoundary`

- Updated dependencies [[`48bd66e`](https://github.com/lemonmade/quilt/commit/48bd66e75923efcb76ce7096db75f5337e1952e7)]:
  - @quilted/assets@0.1.7

## 0.1.12

### Patch Changes

- [#845](https://github.com/lemonmade/quilt/pull/845) [`1e0eda6`](https://github.com/lemonmade/quilt/commit/1e0eda6d035fd6f883d25b5064413adfe80c76ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve server rendering utilities

- Updated dependencies [[`1e0eda6`](https://github.com/lemonmade/quilt/commit/1e0eda6d035fd6f883d25b5064413adfe80c76ea)]:
  - @quilted/request-router@0.3.1
  - @quilted/assets@0.1.6

## 0.1.11

### Patch Changes

- [`479fa1f`](https://github.com/lemonmade/quilt/commit/479fa1f923c9e968a248f23c146be8255347533c) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing an explicit browser details instance on the client

- [`58cd0f9`](https://github.com/lemonmade/quilt/commit/58cd0f93429b3a0a11353303756deb3d3f9c9903) Thanks [@lemonmade](https://github.com/lemonmade)! - Make browser elements render natively for HTML renders

- Updated dependencies [[`58cd0f9`](https://github.com/lemonmade/quilt/commit/58cd0f93429b3a0a11353303756deb3d3f9c9903), [`d1361b4`](https://github.com/lemonmade/quilt/commit/d1361b4c1cf2e67db874d8f20ea83ddb423493af)]:
  - @quilted/browser@0.1.9

## 0.1.10

### Patch Changes

- [`d409c19`](https://github.com/lemonmade/quilt/commit/d409c1930834449160e90b6bedf0fe3f7325d4b0) Thanks [@lemonmade](https://github.com/lemonmade)! - Add more server rendering hooks

- [#843](https://github.com/lemonmade/quilt/pull/843) [`5a8036d`](https://github.com/lemonmade/quilt/commit/5a8036d39d93c576812428ecc8fe537a30696dba) Thanks [@lemonmade](https://github.com/lemonmade)! - Make browser context creation implicit on the client

## 0.1.9

### Patch Changes

- [`ed66780`](https://github.com/lemonmade/quilt/commit/ed66780bfe57daa031d92d0787bde2f424536e30) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove cache key and simplify browser assets type

- Updated dependencies [[`ed66780`](https://github.com/lemonmade/quilt/commit/ed66780bfe57daa031d92d0787bde2f424536e30)]:
  - @quilted/browser@0.1.8
  - @quilted/assets@0.1.5

## 0.1.8

### Patch Changes

- [#836](https://github.com/lemonmade/quilt/pull/836) [`57e6a4d`](https://github.com/lemonmade/quilt/commit/57e6a4d5cb4fc13748ab5f2563dec78a032555ed) Thanks [@lemonmade](https://github.com/lemonmade)! - Update browser serializations to use a custom element instead of `<meta>`

- Updated dependencies [[`57e6a4d`](https://github.com/lemonmade/quilt/commit/57e6a4d5cb4fc13748ab5f2563dec78a032555ed)]:
  - @quilted/browser@0.1.6

## 0.1.7

### Patch Changes

- [`36eb20d`](https://github.com/lemonmade/quilt/commit/36eb20d1d7de6bca25e25bba706ae5af61558a0f) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename "og-meta" APIs to use the full "Open Graph" naming instead.

## 0.1.6

### Patch Changes

- [`31d0761`](https://github.com/lemonmade/quilt/commit/31d0761f7c1d2ffc029861d5d24e1dc453422dce) Thanks [@lemonmade](https://github.com/lemonmade)! - Add helpers for creating `og:` meta tags

- Updated dependencies [[`31d0761`](https://github.com/lemonmade/quilt/commit/31d0761f7c1d2ffc029861d5d24e1dc453422dce), [`b747f2f`](https://github.com/lemonmade/quilt/commit/b747f2f0566457a01103560f464849018e32f404)]:
  - @quilted/browser@0.1.0

## 0.1.5

### Patch Changes

- [`ace1145`](https://github.com/lemonmade/quilt/commit/ace1145130c7beed5edd0ce83cbdf071c6d40105) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix path resolution for explicitly specified entries

- Updated dependencies [[`e115475`](https://github.com/lemonmade/quilt/commit/e115475e522c0502fa0307d1fc477d4de50a6f41), [`7029443`](https://github.com/lemonmade/quilt/commit/7029443cf689ac751de1108e8f6394c7b1cad143)]:
  - @quilted/preact-context@0.1.2
  - @quilted/browser@0.0.4

## 0.1.4

### Patch Changes

- [`8011209`](https://github.com/lemonmade/quilt/commit/8011209b6a424dd39876615edd9642746cd37026) Thanks [@lemonmade](https://github.com/lemonmade)! - Noop server-only components in browser builds

## 0.1.3

### Patch Changes

- Updated dependencies [[`9c0cd74`](https://github.com/lemonmade/quilt/commit/9c0cd7441b0dc86b3ceb54630fa31db1e716b6ed)]:
  - @quilted/browser@0.0.3

## 0.1.2

### Patch Changes

- [`b2020f7`](https://github.com/lemonmade/quilt/commit/b2020f74e07f01f259f59a0a8fa20d51c15a5449) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix serialization in edge cases where scripts load before DOMContentLoaded

- Updated dependencies [[`b2020f7`](https://github.com/lemonmade/quilt/commit/b2020f74e07f01f259f59a0a8fa20d51c15a5449)]:
  - @quilted/browser@0.0.2

## 0.1.1

### Patch Changes

- [`285b2f0`](https://github.com/lemonmade/quilt/commit/285b2f083bfc6fe81db35e2950c8b3ae846486d3) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix templates

- Updated dependencies [[`285b2f0`](https://github.com/lemonmade/quilt/commit/285b2f083bfc6fe81db35e2950c8b3ae846486d3)]:
  - @quilted/preact-context@0.1.1
