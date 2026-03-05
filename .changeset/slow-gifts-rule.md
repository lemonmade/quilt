---
'@quilted/assets': patch
'@quilted/preact-browser': patch
'@quilted/browser': patch
'@quilted/create': patch
'@quilted/rollup': patch
'@quilted/vite': patch
---

Redesign asset loading APIs for better performance and clearer structure.

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
