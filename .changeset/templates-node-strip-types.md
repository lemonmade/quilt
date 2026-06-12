---
'@quilted/create': patch
---

Templates now run TypeScript files with Node directly — using `--experimental-transform-types` (Node 22.7+) — instead of `tsx`, dropping the extra dependency. Generated projects declare `engines.node >= 22.7.0` accordingly.
