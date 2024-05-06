import {
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import {
  toGraphQLSource,
  useGraphQLFetch,
  type GraphQLFetch,
  type GraphQLAnyOperation,
  type GraphQLVariableOptions,
} from '@quilted/quilt/graphql';
import {type IfAllFieldsNullable} from '@quilted/useful-types';

import {throwIfError} from './utilities.ts';

export type GraphQLQueryOptions<Data, Variables> = Omit<
  UseSuspenseQueryOptions<Data>,
  'queryFn' | 'queryKey'
> &
  Partial<Pick<UseSuspenseQueryOptions<Data>, 'queryFn' | 'queryKey'>> &
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
): UseSuspenseQueryResult<Data> {
  const [options = {} as any] = args;

  const {
    variables,
    fetch: explicitFetch,
    queryKey,
    ...reactQueryOptions
  } = options as GraphQLQueryOptions<Data, Variables>;

  const fetchFromContext = useGraphQLFetch({optional: true});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error(
      `No GraphQL fetch found. You either need to have access to a GraphQL fetch in context, or pass one in as the \`fetch\` option to this function.`,
    );
  }

  const fullQueryKey: unknown[] = [
    `query:${
      typeof query === 'string'
        ? query
        : 'id' in query
          ? query.id
          : toGraphQLSource(query)
    }`,
    variables,
  ];

  if (queryKey != null) {
    if (Array.isArray(queryKey)) {
      fullQueryKey.push(...queryKey);
    } else {
      fullQueryKey.push(queryKey);
    }
  }

  return useSuspenseQuery<Data>({
    queryKey: fullQueryKey,
    queryFn: async ({signal}) => {
      const result = await fetch(query, {
        signal,
        variables: variables!,
      });

      throwIfError(result);

      return result.data!;
    },
    ...reactQueryOptions,
  });
}
