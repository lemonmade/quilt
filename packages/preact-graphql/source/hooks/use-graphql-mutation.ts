import {useMemo} from 'preact/hooks';
import {
  GraphQLMutation,
  type GraphQLFetch,
  type GraphQLAnyOperation,
} from '@quilted/graphql';

import {useGraphQLFetch} from './use-graphql-fetch.ts';

export function useGraphQLMutation<Data, Variables>(
  mutation: GraphQLAnyOperation<Data, Variables>,
  {
    fetch: explicitFetch,
  }: {
    fetch?: GraphQLFetch<any>;
  } = {},
) {
  const fetchFromContext = useGraphQLFetch({optional: true});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error('No GraphQL fetch function provided.');
  }

  const mutationAction = useMemo(
    () => new GraphQLMutation(mutation, {fetch}),
    [mutation, fetch],
  );

  return mutationAction;
}
