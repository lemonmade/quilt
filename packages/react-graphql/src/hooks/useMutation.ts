import {useCallback} from 'react';
import type {NoInfer} from '@quilted/useful-types';
import type {
  GraphQLDocument,
  MutationOptions,
  IfAllVariablesOptional,
} from '../types';
import {useGraphQL} from './useGraphQL';

export function useMutation<Data, Variables>(
  mutation: GraphQLDocument<Data, Variables>,
) {
  const graphql = useGraphQL();
  return useCallback(
    (
      ...optionsPart: IfAllVariablesOptional<
        Variables,
        [MutationOptions<Data, NoInfer<Variables>>?],
        [MutationOptions<Data, NoInfer<Variables>>]
      >
    ) => graphql.mutate<Data, Variables>(mutation as any, ...optionsPart),
    [graphql, mutation],
  );
}
