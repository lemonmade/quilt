---
'@quilted/browser': patch
---

Fix head elements managed by `browser.links` and `browser.metas`:

- Server-rendered `<link>` and `<meta>` elements that no client-side `add()` adopts are now removed once the first client render has had its chance to adopt them (in a microtask after the first `add()`). Only elements of a kind the client manages are removed (links by `rel`, metas by `name`/`property`/`http-equiv`); stylesheets and other resource links, and kinds the client never adds (like a server-only `viewport`), are left alone. This keeps a stale server-rendered favicon from outliving hydration.
- Signal-driven attributes now actually update. Previously every change after the first was ignored. Attributes dropped from the signal’s value are removed from the element.
- `<link rel="icon">`, `<link rel="apple-touch-icon">` and `<meta name="theme-color">` are replaced with a fresh element when their attributes change, instead of being mutated in place, because WebKit only reads them on insertion.
- `BrowserLinkAttributes['sizes']` is now a `string`, so `sizes="32x32"` no longer needs a cast.
