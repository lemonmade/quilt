// GraphQL treats "no variables" and "an empty variables object" as the same
// operation, but the default `AsyncAction.hasChanged` comparator does not:
// `JSON.stringify(undefined)` is `undefined`, while `JSON.stringify({})` is
// `'{}'`, so a call to `run()` paired with a call to `run({})` would abort
// the in-flight run and start an identical one. Coercing nullish variables
// to `{}` before comparison closes that gap without leaking GraphQL-specific
// semantics into the generic AsyncAction comparator.
export function graphqlVariablesHaveChanged(
  variables?: unknown,
  lastVariables?: unknown,
) {
  if (variables === lastVariables) return false;
  return stringify(variables) !== stringify(lastVariables);
}

function stringify(variables: unknown) {
  return JSON.stringify(variables ?? {});
}
