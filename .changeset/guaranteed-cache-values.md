---
'@quilted/preact-router': patch
'@quilted/graphql': patch
'@quilted/preact-graphql': patch
'@quilted/quilt': patch
---

Make `Navigation.cache` and `GraphQLClient.cache` always-defined, guaranteed values.

Previously, both `Navigation.cache` and `GraphQLClient.cache` were typed as potentially `undefined` — when caching was disabled via `{cache: false}`, the property was set to `undefined`. This forced consumers to null-check the cache everywhere it was used, even though the common case is for the cache to exist.

Now, both properties are always defined. When caching is disabled, a no-op cache is used that satisfies the full interface but does not persist any data:

- `RouterNavigationCache` gains a `disabled` option. When disabled, `match()` still computes route matches for the current call but does not cache them across calls. `serialize()` returns an empty array and `restore()` is a no-op.
- `GraphQLCache` gains a `disabled` option. When disabled, `query()` and `create()` produce fresh, uncached `GraphQLQuery` instances (no deduplication). `serialize()` returns an empty array and `restore()` is a no-op.

Both classes expose a public `disabled: boolean` property so consumers can check whether caching is active without needing separate state.

**Breaking change:** `Navigation.cache` is now `RouterNavigationCache` (was `RouterNavigationCache | undefined`) and `GraphQLClient.cache` is now `GraphQLCache` (was `GraphQLCache | undefined`). Code that checked for `undefined` to detect disabled caching should use the `.disabled` property instead.
