import {useCallback} from 'react';
import type {NoInfer, IfAllFieldsNullable} from '@quilted/useful-types';
import type {
  GraphQL,
  GraphQLResult,
  GraphQLOperation,
  GraphQLMutationOptions,
} from '@quilted/graphql';
import {useGraphQL} from './useGraphQL';

export interface GraphQLMutationHookOptions {
  graphql?: GraphQL;
}

export function useMutation<Data, Variables>(
  mutation: GraphQLOperation<Data, Variables> | string,
  {graphql: explicitGraphQL}: GraphQLMutationHookOptions = {},
) {
  const graphqlFromContext = useGraphQL({required: false});
  const graphql = explicitGraphQL ?? graphqlFromContext;

  if (graphql == null) {
    throw new Error('No GraphQL context found');
  }

  return useCallback(
    (
      ...optionsPart: IfAllFieldsNullable<
        Variables,
        [GraphQLMutationOptions<Data, NoInfer<Variables>>?],
        [GraphQLMutationOptions<Data, NoInfer<Variables>>]
      >
    ): Promise<GraphQLResult<Data>> =>
      graphql.mutate<Data, Variables>(mutation as any, ...optionsPart),
    [graphql, mutation],
  );
}
