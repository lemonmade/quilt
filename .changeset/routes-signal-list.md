---
'@quilted/preact-router': patch
---

`Routes` and `useRoutes` now accept a signal of the route list, in addition to a plain array.

When the active route tree is swapped based on the current URL (e.g. a cross-scope navigation that activates a different set of routes), passing the list as a plain array makes it a prop gated on the parent component's render — so it lags the `currentRequest` signal the matcher reads directly. For one render the matcher sees the new URL against the old tree, which can mis-match nested routes (the router's per-request entry cache keys entries by structural position, so two trees matched for one navigation can collide and render the wrong route).

Passing the list as a signal derived from the URL keeps both updates in a single glitch-free signal graph, so the matcher re-matches against the new tree in the same tick the URL changes and never observes a mismatched URL/tree pair.
