---
'@quilted/graphql': minor
'@quilted/graphql-tools': minor
'@quilted/rollup': minor
'@quilted/quilt': minor
---

Allow `graphql@17`

Widen the `graphql` version range to `^16.8.0 || ^17.0.0` (`^16.14.0 || ^17.0.0` for `@quilted/quilt`'s peer dependency) so consumers can adopt graphql-js 17. The packages only use the stable `parse` / `print` / `printSchema` / `Source` / `graphql()` / `GraphQLSchema` surface, which is unchanged across the major, so no code changes are required.
