import {useQuery, type UseQueryOptions} from '@tanstack/react-query';
import {
  useGraphQLFetch,
  type GraphQLFetch,
  type GraphQLAnyOperation,
  type GraphQLVariableOptions,
} from '@quilted/quilt/graphql';
import {type IfAllFieldsNullable} from '@quilted/useful-types';

import {throwIfError} from './utilities.ts';

export type GraphQLQueryOptions<Data, Variables> = Omit<
  UseQueryOptions<Data>,
  'queryFn'
> &
  GraphQLVariableOptions<Variables> & {
    fetch?: GraphQLFetch;
  };

export function useGraphQLQuery<Data, Variables>(
  query: GraphQLAnyOperation<Data, Variables>,
  ...args: IfAllFieldsNullable<
    Variables,
    [GraphQLQueryOptions<Data, Variables>?],
    [GraphQLQueryOptions<Data, Variables>]
  >
) {
  const [options = {} as any] = args;

  const {
    variables,
    fetch: explicitFetch,
    queryKey,
    ...reactQueryOptions
  } = options as GraphQLQueryOptions<Data, Variables>;

  const fetchFromContext = useGraphQLFetch({required: false});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error(
      `No GraphQL fetch found. You either need to have access to a GraphQL fetch in context, or pass one in as the \`fetch\` option to this function.`,
    );
  }

  return useQuery<Data>(
    [
      fetch,
      query,
      variables,
      ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
    ],
    async () => {
      const result = await fetch(query, {
        variables: variables!,
      });

      throwIfError(result);

      return result.data!;
    },
    reactQueryOptions,
  );
}
