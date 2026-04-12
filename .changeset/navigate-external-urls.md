---
'@quilted/preact-router': patch
---

Fixed `navigate()` to perform a full page navigation for cross-origin URLs instead of using `history.pushState()`, which only updates the path within the current origin. The origin check is unconditional — `pushState` cannot navigate cross-origin regardless of `isExternal` configuration.
