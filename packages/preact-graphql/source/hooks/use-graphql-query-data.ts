import type {GraphQLQuery} from '@quilted/graphql';

export function useGraphQLQueryData<Data, Variables>(
  query: GraphQLQuery<Data, Variables>,
) {
  if (!query.hasFinished) throw query.promise;

  const value = query.value;

  if (value == null) throw query.latest.error;

  const {data, errors} = value;

  if (data == null) {
    throw new Error(`GraphQL errors: ${JSON.stringify(errors ?? [])}`);
  }

  return data;
}
