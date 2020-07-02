import type {GraphQLDocument} from '@quilted/graphql';

export function cacheKey<Data = unknown, Variables = {}>(
  {id}: GraphQLDocument<Data, Variables>,
  variables?: Variables,
) {
  return `${id}${variables ? JSON.stringify(variables) : '{}'}`;
}
