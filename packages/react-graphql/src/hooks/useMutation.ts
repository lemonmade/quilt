import {useCallback} from 'react';
import type {NoInfer} from '@quilted/useful-types';
import type {
  GraphQLResult,
  GraphQLOperation,
  MutationOptions,
  IfAllVariablesOptional,
} from '@quilted/graphql';
import {useGraphQL} from './useGraphQL';

export function useMutation<Data, Variables>(
  mutation: GraphQLOperation<Data, Variables>,
) {
  const graphql = useGraphQL();
  return useCallback(
    (
      ...optionsPart: IfAllVariablesOptional<
        Variables,
        [MutationOptions<Data, NoInfer<Variables>>?],
        [MutationOptions<Data, NoInfer<Variables>>]
      >
    ): Promise<GraphQLResult<Data>> =>
      graphql.mutate<Data, Variables>(mutation as any, ...optionsPart),
    // Rule is broken, asking for types to be included
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphql, mutation],
  );
}
