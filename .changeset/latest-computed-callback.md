---
'@quilted/preact-signals': patch
---

`useComputed()` now always calls the callback from the latest render, so non-signal values it reads (props, state) are no longer frozen at their first-render value. Recomputation is still driven by signals; pass `args` to recreate the computed signal when a plain value changes.
