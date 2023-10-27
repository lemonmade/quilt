---
'@quilted/events': major
'@quilted/graphql': major
'@quilted/threads': major
'@quilted/useful-react-types': major
'@quilted/useful-types': major
'@quilted/apollo': minor
'@quilted/aws': minor
'@quilted/cloudflare': minor
'@quilted/deno': minor
'@quilted/react-query': minor
'@quilted/assets': minor
'@quilted/async': minor
'@quilted/babel': minor
'@quilted/cli-kit': minor
'@quilted/craft': minor
'@quilted/create': minor
'@quilted/create-app': minor
'@quilted/eslint-config': minor
'@quilted/graphql-tools': minor
'@quilted/http': minor
'@quilted/localize': minor
'@quilted/performance': minor
'@quilted/preact-mini-compat': minor
'@quilted/quilt': minor
'@quilted/react-assets': minor
'@quilted/react-async': minor
'@quilted/react-email': minor
'@quilted/react-graphql': minor
'@quilted/react-html': minor
'@quilted/react-http': minor
'@quilted/react-idle': minor
'@quilted/react-localize': minor
'@quilted/react-performance': minor
'@quilted/react-router': minor
'@quilted/react-server-render': minor
'@quilted/react-signals': minor
'@quilted/react-testing': minor
'@quilted/react-utilities': minor
'@quilted/react-workers': minor
'@quilted/request-router': minor
'@quilted/rollup': minor
'@quilted/routing': minor
'@quilted/signals': minor
'@quilted/trpc': minor
'@quilted/typescript': minor
'@quilted/use-subscription': minor
'@quilted/workers': minor
'@quilted/react': patch
'@quilted/react-dom': patch
'e2e-tests': patch
'e2e-fixture-basic-api': patch
'e2e-fixture-basic-app': patch
'e2e-fixture-empty-app': patch
---

Removed CommonJS support

The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.
