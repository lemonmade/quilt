---
'@quilted/preact-browser': minor
---

Add `<Favicon icons={[{source, sizes, type, rel}, …]} />` and `useFavicons()`, which own a whole set of icon links and swap them together whenever any icon changes. `icons` can also be a signal. `useFavicon()` now also updates when its `type` option changes.
