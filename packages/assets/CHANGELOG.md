# @quilted/assets

## 0.1.10

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

## 0.1.9

### Patch Changes

- [`0312ff0`](https://github.com/lemonmade/quilt/commit/0312ff034b94605abc80c5b343a49c688c0ba618) Thanks [@lemonmade](https://github.com/lemonmade)! - Add integrity to preload headers

## 0.1.8

### Patch Changes

- [`c421ad9`](https://github.com/lemonmade/quilt/commit/c421ad92ce5554d2b6b9c0b44f24378759dce5ab) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow additional entries to be marked as inlined to include their content in the browser asset manifest

## 0.1.7

### Patch Changes

- [`48bd66e`](https://github.com/lemonmade/quilt/commit/48bd66e75923efcb76ce7096db75f5337e1952e7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some server render bugs

## 0.1.6

### Patch Changes

- [#845](https://github.com/lemonmade/quilt/pull/845) [`1e0eda6`](https://github.com/lemonmade/quilt/commit/1e0eda6d035fd6f883d25b5064413adfe80c76ea) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve server rendering utilities

## 0.1.5

### Patch Changes

- [`ed66780`](https://github.com/lemonmade/quilt/commit/ed66780bfe57daa031d92d0787bde2f424536e30) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove cache key and simplify browser assets type

## 0.1.4

### Patch Changes

- [`f779435`](https://github.com/lemonmade/quilt/commit/f779435d9b943d342c058bcf2e3049696c1a512e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic support for SRI hashes

## 0.1.3

### Patch Changes

- [#805](https://github.com/lemonmade/quilt/pull/805) [`4995757`](https://github.com/lemonmade/quilt/commit/49957579a4811a1c310635f5dcdb4e67668ec22e) Thanks [@lemonmade](https://github.com/lemonmade)! - Compress built asset manifest and allow multiple named entries

## 0.1.2

### Patch Changes

- [#716](https://github.com/lemonmade/quilt/pull/716) [`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor browser APIs

## 0.1.1

### Patch Changes

- [`6c7371f7`](https://github.com/lemonmade/quilt/commit/6c7371f7a34ce89383adec9501ca31db5ce4d3c7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset references during development

## 0.1.0

### Minor Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

## 0.0.5

### Patch Changes

- [`750dd6b9`](https://github.com/lemonmade/quilt/commit/750dd6b9cb6a18648cc793f57579fb0b64cb23bc) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Rollup dependencies

## 0.0.4

### Patch Changes

- [#612](https://github.com/lemonmade/quilt/pull/612) [`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app template APIs

## 0.0.3

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.0.2

### Patch Changes

- [#532](https://github.com/lemonmade/quilt/pull/532) [`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56) Thanks [@lemonmade](https://github.com/lemonmade)! - Move asset manifest code into asset packages

## 0.0.1

### Patch Changes

- [#527](https://github.com/lemonmade/quilt/pull/527) [`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve asset manifests
