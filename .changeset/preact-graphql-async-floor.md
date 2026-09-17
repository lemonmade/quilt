---
'@quilted/preact-graphql': patch
---

Raise the minimum `@quilted/preact-async` version to `0.1.25`. The older floor kept a second copy of `@quilted/preact-browser` (and with it `@quilted/browser@0.2.5`) in consumers' trees, so the `<head>` element fix released in `@quilted/browser@0.2.7` did not reach every path.
