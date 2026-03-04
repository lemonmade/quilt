---
'@quilted/create': patch
---

Refactor app template context structure: replace `shared/` directory with `context/` directory

The `shared/` directory, which used TypeScript declaration merging to build up the `AppContext` interface across multiple files, has been replaced with a `context/` directory that defines the full interface explicitly in a single `types.ts` file. This makes the shape of the application context immediately visible without needing to trace module augmentations.

The new structure separates each concern into its own file: `types.ts` owns the interface, `navigation.ts` provides the router and route helpers, `preact.ts` holds the Preact context binding, `browser.ts` exports `BrowserAppContext`, and `server.ts` exports `ServerAppContext`. The context classes have been extracted from `browser.tsx` and `server.tsx` into these dedicated files, keeping the entry points lean.

Navigation is now accessed as `context.navigation.router` instead of `context.router`, grouping router state under a `navigation` namespace. A `browser.css` file has also been added to each app template for global CSS resets.
