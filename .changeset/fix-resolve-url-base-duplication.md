---
'@quilted/routing': patch
---

Fixed `resolveURL()` to not double-apply the base prefix when using the object form (`{search}`) without a `path`. When `path` is omitted, the pathname is taken from the current URL which already includes the base prefix — passing `base` to the recursive call caused it to be prepended again on each navigation.
