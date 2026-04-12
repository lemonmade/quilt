---
'@quilted/preact-router': patch
---

Fixed the `Link` component to pass the `target` prop through to the rendered anchor element, and to skip client-side navigation when any `target` attribute is set (not just `_blank`).
