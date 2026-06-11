---
'@quilted/rollup': minor
---

Added a `source` option to the `graphql()` build feature. Setting `source: false` omits the operation source from the transformed `.graphql` modules — each module then contains only the operation's `id`, `type`, and `name`, keeping query text out of your JavaScript bundles entirely. This is designed for "persisted" GraphQL operations: pair it with the existing `manifest` option (which still receives the full source for every operation, so a server can map `id` back to the executable document) and with the `source` option of `createGraphQLFetch()` (which omits the missing source from requests). Fragment-only documents keep their source regardless, since they only exist at runtime to be inlined into the operations that `#import` them.
