---
'@quilted/preact-router': minor
---

Allow `Navigation`'s `base` to be a function

`base` now also accepts `(url: URL) => string | URL` (exported as the `NavigationBase` type), re-evaluated against the current URL on every read. A string or `URL` still pins the base for the navigation's lifetime; the function form lets the base change in place as the app navigates — useful for multi-tenant apps that swap a scope prefix (e.g. `/@tenant`) on a client-side navigation rather than a full page reload. The navigation cache now reads the base lazily, so route matching follows the live base instead of a value frozen at construction.
