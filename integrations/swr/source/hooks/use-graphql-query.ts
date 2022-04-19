import type {SWRConfiguration} from 'swr';
import {useGraphQL} from '@quilted/quilt';
import type {
  GraphQL,
  GraphQLOperation,
  GraphQLVariableOptions,
} from '@quilted/quilt';
import type {IfAllFieldsNullable} from '@quilted/useful-types';

import {useSWR} from './use-swr';

export type GraphQLQueryOptions<Data, Variables> = SWRConfiguration<Data> &
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
  const [options = {} as any as GraphQLQueryOptions<Data, Variables>] = args;

  const {variables, graphql: explicitGraphQL, ...swrOptions} = options;

  const graphqlFromContext = useGraphQL({required: false});
  const graphql = explicitGraphQL ?? graphqlFromContext;

  if (graphql == null) {
    throw new Error(
      `No GraphQL client found. You either need to have access to a GraphQL client in context, or pass one in as the \`graphql\` option to this function.`,
    );
  }

  return useSWR<Data>(
    [`__quilt-swr-graphql:${queryToKey(query)}`, variables],
    async () => {
      const {data, error} = await graphql.query(query, {
        variables: variables as any,
      });

      if (error) {
        throw error;
      }

      return data!;
    },
    swrOptions,
  );
}

function queryToKey(query: GraphQLOperation<any, any> | string) {
  return typeof query === 'string' ? query : query.id;
}
