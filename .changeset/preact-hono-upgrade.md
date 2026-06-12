---
'@quilted/events': patch
'@quilted/hono': patch
'@quilted/preact-async': patch
'@quilted/preact-browser': patch
'@quilted/preact-context': patch
'@quilted/preact-email': patch
'@quilted/preact-graphql': patch
'@quilted/preact-localize': patch
'@quilted/preact-performance': patch
'@quilted/preact-router': patch
'@quilted/preact-signals': patch
'@quilted/preact-testing': patch
'@quilted/preact-workers': patch
'@quilted/quilt': patch
'@quilted/react': patch
'@quilted/react-dom': patch
'@quilted/react-query': patch
'@quilted/react-testing': patch
'@quilted/signals': patch
'@quilted/threads': patch
'@quilted/vite': patch
---

Upgraded the Preact and Hono dependency ecosystems to their current releases: preact 10.29.2, preact-render-to-string 6.7.0, @preact/signals 2.9, @preact/signals-core 1.14.2, @prefresh/vite 3, hono 4.12, and @hono/node-server 2. These are bumped together, and pinned to a single version tree-wide (via pnpm overrides), because mixing Preact copies crashes server rendering.
