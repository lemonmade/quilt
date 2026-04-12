---
'@quilted/preact-router': patch
---

Fixed `navigate()` to perform a full page navigation for cross-origin URLs instead of using `history.pushState()`, which only updates the path within the current origin. This matches the external URL detection already used by `resolve()` and the `Link` component.
