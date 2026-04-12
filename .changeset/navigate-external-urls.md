---
'@quilted/preact-router': patch
---

Fixed `navigate()` to perform a full page navigation for cross-origin URLs instead of using `history.pushState()`, which only updates the path within the current origin. Cross-origin URLs always trigger a full navigation (since `pushState` cannot handle them), and same-origin URLs also check the `isExternal` option for cases where the app considers certain same-origin URLs external.
