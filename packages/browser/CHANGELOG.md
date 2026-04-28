# @quilted/browser

## 0.2.5

### Patch Changes

- [#922](https://github.com/lemonmade/quilt/pull/922) [`297c540`](https://github.com/lemonmade/quilt/commit/297c5401bda5e6d37a9d64037b7dd5fe4651cb30) Thanks [@lemonmade](https://github.com/lemonmade)! - Move `HTMLTemplate` serializations and asset placeholders into `<head>` by default

  `HTMLTemplate.Body` previously rendered the `<HTMLTemplate.Serializations />` and `<HTMLTemplate.Assets />` placeholders directly inside `<body>`, ahead of the app content. That layout produced a Safari-specific flash of unstyled content on initial paint: body-positioned `<link rel=stylesheet>` (even with `blocking="render"`) didn't reliably stop the parser from committing the body content that preceded them.

  The default placement is now:

  - `HTMLTemplate.Head` renders title/links/metas, then `<HTMLTemplate.Serializations />`, then the three `<HTMLTemplate.Assets />` placeholders (entry, async, preload) — same order `HTMLTemplate.Body` used to use.
  - `HTMLTemplate.Body` renders only the wrapper + `<HTMLTemplate.Content />`.

  Stylesheet links land in `<head>`, where they block initial render the standards-correct way; `Link: rel=preload` HTTP headers and the in-document `<link>` tags now consistently target the same location, so the preload scanner picks the same URLs both ways.

  Apps that already pass a custom `head={…}` or `body={…}` to `HTMLTemplate` aren't affected — the change is in the default content of `HTMLTemplateHead` / `HTMLTemplateBody`, which only takes effect when the `children` prop on those components isn't provided.

  `<Serialization>` now renders as `<script type="quilt/serialization" data-name=...>JSON</script>` instead of `<browser-serialization name=... content=...>`. The script form is required for the head positioning above: `<browser-serialization>` is unknown to the HTML parser, which treats it as flow content; encountering one in `<head>` would close `<head>` and start `<body>`, dragging the asset placeholders out of the head with it. The script form is parser-safe in both head and body, doesn't execute (the type isn't a recognized JS MIME), and the JSON payload escapes "<" to its unicode form so a `</script>` inside a serialized value can't terminate the tag. The client-side reader (`BrowserSerializations`) was updated to match; the legacy `BrowserSerializationElement` custom-element class still works for anyone defining it programmatically (the read path falls back to its `name` / `content` attributes).

## 0.2.4

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

## 0.2.3

### Patch Changes

- [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact and Signal dependencies

- Updated dependencies [[`b1df5da`](https://github.com/lemonmade/quilt/commit/b1df5daff8441f8435a62b02b4ad3676d3ddcc3b), [`e6fa47e`](https://github.com/lemonmade/quilt/commit/e6fa47e93981ce0eaebbe1546659aaa08cc22689)]:
  - @quilted/assets@0.1.11
  - @quilted/signals@0.2.4

## 0.2.2

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

## 0.2.1

### Patch Changes

- [`88d10ef`](https://github.com/lemonmade/quilt/commit/88d10ef57f6805d44325f5dd05687862c619cc55) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix incorrect setting of null attributes

## 0.2.0

### Minor Changes

- [#872](https://github.com/lemonmade/quilt/pull/872) [`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Replace @quilted/request-router with Hono

### Patch Changes

- [#872](https://github.com/lemonmade/quilt/pull/872) [`8bf65e7`](https://github.com/lemonmade/quilt/commit/8bf65e797f929ee95730323426c229409e65c9a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `ResponseCookies` class to `@quilted/browser/server`

## 0.1.12

### Patch Changes

- [`64fc42b`](https://github.com/lemonmade/quilt/commit/64fc42b87ca72eec8dfab211d2ddecdbbaa0e4ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Transition browser header helpers to use classes

## 0.1.11

### Patch Changes

- [`a7478d1`](https://github.com/lemonmade/quilt/commit/a7478d1ae640ab2571f909f6e4edef0e29109f14) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix uncaught error in environments without cookie support

## 0.1.10

### Patch Changes

- [`33cf6c8`](https://github.com/lemonmade/quilt/commit/33cf6c87e899b54865fe6f1d82b5dab469e7a5fe) Thanks [@lemonmade](https://github.com/lemonmade)! - Move headers to be server-only in default templates

- Updated dependencies [[`c421ad9`](https://github.com/lemonmade/quilt/commit/c421ad92ce5554d2b6b9c0b44f24378759dce5ab)]:
  - @quilted/assets@0.1.8

## 0.1.9

### Patch Changes

- [`58cd0f9`](https://github.com/lemonmade/quilt/commit/58cd0f93429b3a0a11353303756deb3d3f9c9903) Thanks [@lemonmade](https://github.com/lemonmade)! - Make browser elements render natively for HTML renders

- [`d1361b4`](https://github.com/lemonmade/quilt/commit/d1361b4c1cf2e67db874d8f20ea83ddb423493af) Thanks [@lemonmade](https://github.com/lemonmade)! - Add method to delete serialization on the client

## 0.1.8

### Patch Changes

- [`ed66780`](https://github.com/lemonmade/quilt/commit/ed66780bfe57daa031d92d0787bde2f424536e30) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove cache key and simplify browser assets type

- Updated dependencies [[`ed66780`](https://github.com/lemonmade/quilt/commit/ed66780bfe57daa031d92d0787bde2f424536e30)]:
  - @quilted/assets@0.1.5

## 0.1.7

### Patch Changes

- [`a861bd6`](https://github.com/lemonmade/quilt/commit/a861bd6c7213982882463e800af776b2ec6b15c3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add more streaming-friendly APIs

- [`655da1f`](https://github.com/lemonmade/quilt/commit/655da1f9572b164e28d9b52b65ce05030d5494e0) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for waiting on streamed serializations

## 0.1.6

### Patch Changes

- [#836](https://github.com/lemonmade/quilt/pull/836) [`57e6a4d`](https://github.com/lemonmade/quilt/commit/57e6a4d5cb4fc13748ab5f2563dec78a032555ed) Thanks [@lemonmade](https://github.com/lemonmade)! - Update browser serializations to use a custom element instead of `<meta>`

## 0.1.5

### Patch Changes

- [`5a8492b`](https://github.com/lemonmade/quilt/commit/5a8492bb55af138dfb3887f71d020a9e277fd7d5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix meta deduplication

## 0.1.4

### Patch Changes

- [`79e1393`](https://github.com/lemonmade/quilt/commit/79e13933fad94af48730ed2266b8255ef89c35a1) Thanks [@lemonmade](https://github.com/lemonmade)! - Deduplicate `meta` tags during server rendering

## 0.1.3

### Patch Changes

- [`fb1d3ef`](https://github.com/lemonmade/quilt/commit/fb1d3ef138590d047d09a32245ae4f220f0451a3) Thanks [@lemonmade](https://github.com/lemonmade)! - Make browser localization more powerful and automatic

## 0.1.2

### Patch Changes

- [#788](https://github.com/lemonmade/quilt/pull/788) [`85a4b7e`](https://github.com/lemonmade/quilt/commit/85a4b7ed8e6ad58662ebf969d8fabbe8e21510a3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `Browser.locale` and use it in place of `useLocaleFromEnvironment()`

## 0.1.1

### Patch Changes

- [`4cfb1f5`](https://github.com/lemonmade/quilt/commit/4cfb1f58101287906c2d95dd10694fc090ec3ff1) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow serializing more common JavaScript object types

## 0.1.0

### Minor Changes

- [`b747f2f`](https://github.com/lemonmade/quilt/commit/b747f2f0566457a01103560f464849018e32f404) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing more forms of initial serialization to `BrowserResponseSerializations`

### Patch Changes

- [`31d0761`](https://github.com/lemonmade/quilt/commit/31d0761f7c1d2ffc029861d5d24e1dc453422dce) Thanks [@lemonmade](https://github.com/lemonmade)! - Add helpers for creating `og:` meta tags

## 0.0.4

### Patch Changes

- [`7029443`](https://github.com/lemonmade/quilt/commit/7029443cf689ac751de1108e8f6394c7b1cad143) Thanks [@lemonmade](https://github.com/lemonmade)! - Add browser noop for server entrypoint

## 0.0.3

### Patch Changes

- [`9c0cd74`](https://github.com/lemonmade/quilt/commit/9c0cd7441b0dc86b3ceb54630fa31db1e716b6ed) Thanks [@lemonmade](https://github.com/lemonmade)! - Make `BrowserTestMock` options optional

## 0.0.2

### Patch Changes

- [`b2020f7`](https://github.com/lemonmade/quilt/commit/b2020f74e07f01f259f59a0a8fa20d51c15a5449) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix serialization in edge cases where scripts load before DOMContentLoaded

## 0.0.1

### Patch Changes

- [#716](https://github.com/lemonmade/quilt/pull/716) [`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor browser APIs

- Updated dependencies [[`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be)]:
  - @quilted/assets@0.1.2
