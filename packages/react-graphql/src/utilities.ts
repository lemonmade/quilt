import type {GraphQLOperation} from '@quilted/graphql';

export function cacheKey<Data = unknown, Variables = {}>(
  {id}: GraphQLOperation<Data, Variables>,
  variables?: Variables,
) {
  return `${id}${variables ? JSON.stringify(variables) : '{}'}`;
}
