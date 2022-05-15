import type {SWRConfiguration} from 'swr';
import {useGraphQLFetch} from '@quilted/quilt';
import type {
  GraphQLFetch,
  GraphQLOperation,
  GraphQLVariableOptions,
} from '@quilted/quilt';
import type {IfAllFieldsNullable} from '@quilted/useful-types';

import {useSWR} from './use-swr';

export type GraphQLQueryOptions<Data, Variables> = SWRConfiguration<Data> &
  GraphQLVariableOptions<Variables> & {
    fetch?: GraphQLFetch;
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

  const {variables, fetch: explicitFetch, ...swrOptions} = options;

  const fetchFromContext = useGraphQLFetch({required: false});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error(
      `No GraphQL fetch found. You either need to have access to a GraphQL fetch in context, or pass one in as the \`fetch\` option to this function.`,
    );
  }

  return useSWR<Data>(
    [`__quilt-swr-graphql:${queryToKey(query)}`, variables],
    async () => {
      const {data, errors} = await fetch(
        typeof query === 'string' ? {id: query, source: query} : query,
        {
          variables: variables as any,
        },
      );

      if (errors && errors.length > 0) {
        throw new Error(errors[0]!.message);
      }

      return data!;
    },
    swrOptions,
  );
}

function queryToKey(query: GraphQLOperation<any, any> | string) {
  return typeof query === 'string' ? query : query.id;
}
