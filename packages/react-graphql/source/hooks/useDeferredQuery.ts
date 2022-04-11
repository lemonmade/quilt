import {useCallback} from 'react';
import type {NoInfer, IfAllFieldsNullable} from '@quilted/useful-types';
import type {GraphQLOperation, GraphQLQueryOptions} from '@quilted/graphql';
import {cacheKey as getCacheKey} from '@quilted/graphql';

import {useGraphQL} from './useGraphQL';

export function useDeferredQuery<Data, Variables>(
  query: GraphQLOperation<Data, Variables>,
  ...optionsPart: IfAllFieldsNullable<
    Variables,
    [GraphQLQueryOptions<Data, NoInfer<Variables>>?],
    [GraphQLQueryOptions<Data, NoInfer<Variables>>]
  >
) {
  const [options] = optionsPart;
  const cacheKey = getCacheKey(query, options?.variables);

  const graphql = useGraphQL();

  return useCallback(() => {
    (graphql.query as any)(query, ...optionsPart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphql, cacheKey]);
}
