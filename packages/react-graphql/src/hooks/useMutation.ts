import {useCallback} from 'react';
import type {NoInfer} from '@quilted/useful-types';
import type {
  GraphQL,
  GraphQLResult,
  GraphQLOperation,
  MutationOptions,
  IfAllVariablesOptional,
} from '@quilted/graphql';
import {useGraphQLInternal} from './useGraphQL';

export interface MutationHookOptions {
  graphql?: GraphQL;
}

export function useMutation<Data, Variables>(
  mutation: GraphQLOperation<Data, Variables>,
  {graphql: explicitGraphQL}: MutationHookOptions = {},
) {
  const graphqlFromContext = useGraphQLInternal();
  const graphql = explicitGraphQL ?? graphqlFromContext;

  if (graphql == null) {
    throw new Error('No GraphQL context found');
  }

  return useCallback(
    (
      ...optionsPart: IfAllVariablesOptional<
        Variables,
        [MutationOptions<Data, NoInfer<Variables>>?],
        [MutationOptions<Data, NoInfer<Variables>>]
      >
    ): Promise<GraphQLResult<Data>> =>
      graphql.mutate<Data, Variables>(mutation as any, ...optionsPart),
    [graphql, mutation],
  );
}
