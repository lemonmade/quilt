import {useCallback} from 'react';
import type {NoInfer} from '@quilted/useful-types';

import {cacheKey as getCacheKey} from '../utilities';
import type {
  GraphQLOperation,
  IfAllVariablesOptional,
  QueryOptions,
} from '../types';

import {useGraphQL} from './useGraphQL';

export function useDeferredQuery<Data, Variables>(
  query: GraphQLOperation<Data, Variables>,
  ...optionsPart: IfAllVariablesOptional<
    Variables,
    [QueryOptions<Data, NoInfer<Variables>>?],
    [QueryOptions<Data, NoInfer<Variables>>]
  >
) {
  const [options] = optionsPart;
  const cacheKey = getCacheKey(query, options?.variables);

  const graphQL = useGraphQL();

  return useCallback(() => {
    graphQL.query<Data, Variables>(query as any, ...optionsPart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphQL, cacheKey]);
}
