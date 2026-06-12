---
'@quilted/vite': minor
'@quilted/quilt': patch
---

Added support for Vite 8 (built on Rolldown). `@quilted/vite`'s plugins now type-check against Vite 8's rolldown-based plugin context, and the `vite`/`vitest` peer ranges accept 8.x / 4.x. `@quilted/quilt`'s `vitest` peer range also accepts Vitest 4. Vite 5–7 and Vitest 1–3 remain supported.
