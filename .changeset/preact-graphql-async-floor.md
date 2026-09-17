---
'@quilted/preact-graphql': patch
'@quilted/quilt': patch
---

Raise the minimum `@quilted/preact-async` version to `0.1.25`. The older floor kept a second copy of `@quilted/preact-browser` (and with it `@quilted/browser@0.2.5`) in consumers' trees, so the `<head>` element fix released in `@quilted/browser@0.2.7` did not reach every path. `@quilted/quilt` is released alongside it so its floor rises too, otherwise a consumer keeps resolving the old `preact-graphql`.
