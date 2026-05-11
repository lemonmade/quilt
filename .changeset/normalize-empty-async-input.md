---
'@quilted/async': patch
---

Treat `undefined` and an empty object as the same input in `AsyncAction.run`

The default `hasChanged` comparator stringified inputs with `JSON.stringify` and compared the result. Because `JSON.stringify(undefined)` is `undefined` (not a string) and `JSON.stringify({})` is `'{}'`, calling `action.run()` and `action.run({})` were treated as different inputs — the second call aborted the in-flight run and started an identical one.

This was easy to trigger with `@quilted/graphql`. A route loader that calls `cache.query(operation)` (no `variables` argument, so `variables = undefined` flows into `AsyncAction.run`) paired with a hook that calls `query.run({}, {signal})` — or vice versa — produced a canceled request followed by an identical replay on every navigation.

The default comparator now coerces nullish inputs to `{}` before stringifying. `run()`, `run(undefined)`, `run(null)`, and `run({})` all collapse to a single in-flight run. Non-empty inputs are unchanged, and an empty array is still treated as a real input (distinct from `undefined`).
