---
'@quilted/graphql': patch
---

Treat no variables and an empty variables object as the same input in `GraphQLQuery` and `GraphQLMutation`

The default `AsyncAction.hasChanged` comparator stringifies inputs with `JSON.stringify` and compares the result. Because `JSON.stringify(undefined)` is `undefined` (not a string) and `JSON.stringify({})` is `'{}'`, a call to `query.run()` followed by a call to `query.run({})` (or vice versa) was treated as two different inputs — the second call aborted the in-flight run and started an identical one.

This was easy to trigger in practice: a route loader that calls `cache.query(operation)` (no `variables` argument, so `variables = undefined` flows into `GraphQLQuery.run`) paired with a `useGraphQLQuery({variables: {}})` (or a hook that calls `query.run({}, {signal})`) produced a canceled request followed by an identical replay on every navigation.

`GraphQLQuery` and `GraphQLMutation` now pass a variables-aware `hasChanged` to the underlying `AsyncAction`. It coerces nullish variables to `{}` before stringifying, so `run()`, `run(undefined)`, `run(null)`, and `run({})` all collapse to a single in-flight run. Non-empty variables continue to compare by value as before.

The generic `AsyncAction` comparator is unchanged — `undefined` and `{}` are GraphQL-specific equivalents, not a property of every async input.
