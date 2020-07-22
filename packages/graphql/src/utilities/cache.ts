import type {GraphQLOperation} from '../types';

export function cacheKey<Data = unknown, Variables = {}>(
  {id}: GraphQLOperation<Data, Variables>,
  variables?: Variables,
) {
  return `${id}${variables ? JSON.stringify(variables) : '{}'}`;
}
