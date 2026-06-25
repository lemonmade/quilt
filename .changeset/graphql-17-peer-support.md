---
'@quilted/graphql': minor
'@quilted/graphql-tools': minor
'@quilted/rollup': minor
'@quilted/quilt': minor
---

Support `graphql@17`

- Widen the `graphql` version range to `^16.8.0 || ^17.0.0` (`^16.14.0 || ^17.0.0` for `@quilted/quilt`'s peer dependency) so consumers can adopt graphql-js 17.
- Fix custom scalar coercion under graphql 17: `createGraphQLSchema` now also assigns the renamed `coerceOutputValue` / `coerceInputValue` / `coerceInputLiteral` methods, not only the legacy `serialize` / `parseValue` / `parseLiteral`. graphql-js 17 reads the new names at execution and fixes them at construction, so without this a custom scalar's input validation silently stopped running (e.g. a bad value passed through a variable was accepted). No effect on graphql 16, where the extra properties are ignored.
