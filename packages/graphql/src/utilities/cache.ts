import type {GraphQLOperation} from '../types';

export function cacheKey<Data, Variables>(
  {id}: GraphQLOperation<Data, Variables>,
  variables?: Variables,
) {
  return `${id}${JSON.stringify(variables ? sortVariables(variables) : {})}`;
}

function sortVariables<T>(variables: T) {
  const newVariables: T = {} as any;

  for (const sortedKey of Object.keys(variables).sort((keyOne, keyTwo) =>
    keyOne.localeCompare(keyTwo),
  ) as (keyof T)[]) {
    newVariables[sortedKey] = variables[sortedKey];
  }

  return newVariables;
}
