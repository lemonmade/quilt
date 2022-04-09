import {useQuery} from 'react-query';
import type {QueryOptions} from 'react-query';
import {useGraphQL} from '@quilted/quilt';
import type {
  GraphQL,
  GraphQLOperation,
  GraphQLVariableOptions,
} from '@quilted/quilt';
import type {IfAllFieldsNullable} from '@quilted/useful-types';

export type GraphQLQueryOptions<Data, Variables> = Omit<
  QueryOptions<Data>,
  'queryFn'
> &
  GraphQLVariableOptions<Variables> & {
    graphql?: GraphQL;
  };

export function useGraphQLQuery<Data, Variables>(
  query: GraphQLOperation<Data, Variables> | string,
  ...args: IfAllFieldsNullable<
    Variables,
    [GraphQLQueryOptions<Data, Variables>?],
    [GraphQLQueryOptions<Data, Variables>]
  >
) {
  const [options = {} as any] = args;

  const {
    variables,
    graphql: explicitGraphQL,
    queryKey,
    ...reactQueryOptions
  } = options as GraphQLQueryOptions<Data, Variables>;

  const graphqlFromContext = useGraphQL({required: false});
  const graphql = explicitGraphQL ?? graphqlFromContext;

  if (graphql == null) {
    throw new Error(
      `No GraphQL client found. You either need to have access to a GraphQL client in context, or pass one in as the \`graphql\` option to this function.`,
    );
  }

  return useQuery<Data>(
    [
      graphql,
      query,
      variables,
      ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
    ],
    async () => {
      const {data, error} = await graphql.query(query, {
        variables: variables as any,
      });

      if (error) {
        throw error;
      }

      return data!;
    },
    reactQueryOptions,
  );
}
