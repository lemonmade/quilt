---
'@quilted/preact-graphql': minor
---

Declare a `graphql` peer dependency (`^16.8.0 || ^17.0.0`, optional)

`@quilted/preact-graphql` depends on `@quilted/graphql` but didn't declare its own `graphql` peer, so a consumer adopting graphql-js 17 could end up with the package's `@quilted/graphql` deduped against an older graphql 16 copy — leaving two graphql versions in the tree and tripping graphql's nominal `TypedDocumentNode` type checks. Declaring the peer lets the consumer's graphql resolve a single copy.
