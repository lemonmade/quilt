import {useMemo, useRef} from 'preact/hooks';
import {
  GraphQLQuery,
  type GraphQLFetch,
  type GraphQLAnyOperation,
  type GraphQLCache,
} from '@quilted/graphql';
import {
  resolveSignalOrValue,
  type ReadonlySignal,
} from '@quilted/preact-signals';
import {
  useAsync,
  type AsyncActionCacheKey,
  type UseAsyncActionOptions,
} from '@quilted/preact-async';

import {useGraphQLFetch} from './use-graphql-fetch.ts';
import {useGraphQLCache} from './use-graphql-cache.ts';

export function useGraphQLQuery<Data, Variables>(
  query: GraphQLAnyOperation<Data, Variables>,
  {
    variables,
    tags,
    signal,
    suspend,
    key,
    active,
    cached,
    cache: explicitCache,
    fetch: explicitFetch,
  }: NoInfer<
    {
      fetch?: GraphQLFetch<any>;
      variables?: Variables | ReadonlySignal<Variables>;
      cache?: GraphQLCache | boolean;
      key?: AsyncActionCacheKey;
    } & Pick<
      UseAsyncActionOptions<Data, Variables>,
      'active' | 'signal' | 'suspend' | 'tags' | 'cached'
    >
  > = {},
) {
  const internalsRef = useRef<
    Pick<
      UseAsyncActionOptions<Data, Variables>,
      'tags' | 'signal' | 'cached'
    > & {variables?: Variables | ReadonlySignal<Variables>}
  >();
  internalsRef.current ??= {};
  Object.assign(internalsRef.current, {
    tags,
    signal,
    cached,
    variables,
  });

  const fetchFromContext = useGraphQLFetch({optional: true});
  const fetch = explicitFetch ?? fetchFromContext;

  const cacheFromContext = useGraphQLCache({
    optional: explicitCache !== true,
  });
  const cache =
    typeof explicitCache === 'boolean'
      ? explicitCache
        ? cacheFromContext
        : undefined
      : cacheFromContext;

  if (cache == null && Boolean(explicitCache)) {
    throw new Error('No cache provided for GraphQL query.');
  }

  const queryAction = useMemo(() => {
    if (cache == null) {
      if (fetch == null) {
        throw new Error('No GraphQL fetch function provided.');
      }

      return new GraphQLQuery(query, {fetch});
    }

    const {cached, variables} = internalsRef.current!;

    return cache.create(query, {
      fetch,
      key,
      tags,
      cached: cached
        ? {input: resolveSignalOrValue(variables, {peek: true}), ...cached}
        : undefined,
    });
  }, [query, fetch, cache, key]);

  useAsync(queryAction, {input: variables, active, signal, suspend});

  return queryAction;
}
