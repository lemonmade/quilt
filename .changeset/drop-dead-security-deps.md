---
'@quilted/cloudflare': patch
'@quilted/hono': patch
---

Remove two dependencies that were declared but never imported.

`@quilted/cloudflare` declared `miniflare@^2.4.0`. Miniflare 2 is deprecated, and
nothing in the package imports it — the only remaining references are a comment
URL and a line of README prose. The declaration alone pulled a large tree
(`undici@5`, `node-forge`, `ws`, `tmp`) into every consumer's lockfile, and was
the single largest source of security advisories reaching downstream projects.

`@quilted/hono` declared `send@^0.17.0` (and `@types/send`). Static file serving
goes through `@hono/node-server/serve-static`; `send` is never imported. The
`^0.17.0` range also could not reach `send@0.19.0`, where a low-severity
advisory is patched, so consumers had no way to resolve a clean version.
