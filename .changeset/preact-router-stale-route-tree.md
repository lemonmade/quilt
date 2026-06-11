---
'@quilted/preact-router': patch
---

Fixed `useRoutes` rendering a stale route tree after the active set of routes changes

When the array of routes passed to `useRoutes` changed in place — for example an app that swaps its whole route tree based on the current tenant/scope rather than reloading — the hook kept matching against the tree it captured on its first render, so a navigation that needed the new tree fell through to whatever the old tree matched (often a catch-all "not found"). A full page reload fixed it because that remounted the hook with the correct tree.

Two causes, both fixed:

- `useRoutes` memoised its matching `computed` with only `[navigation, parentEntry]` as dependencies, so the closure pinned the `routes`/`context` from first render. They're now dependencies, so the matcher re-runs against the current tree.
- `RouterNavigationCache#match` cached the matched stack keyed solely by navigation request id, ignoring the `routes` argument — so even once a fresh match ran, it returned the stale cached stack for that navigation. The cache entry now records the route tree it was produced from and is only reused when the same tree is passed back.

Consumers that pass a new `routes` array every render should memoise it (as is conventional for hook inputs) to avoid re-matching on every render.
