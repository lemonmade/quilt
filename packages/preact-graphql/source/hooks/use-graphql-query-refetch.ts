import {useEffect} from 'preact/hooks';
import type {GraphQLQuery} from '@quilted/graphql';

export function useGraphQLQueryRefetchOnMount<Data, Variables>(
  query: GraphQLQuery<Data, Variables>,
  dependencies: readonly unknown[] = [],
) {
  return useEffect(() => {
    if (!query.isRunning) query.rerun({force: true});
  }, [query, ...dependencies]);
}
