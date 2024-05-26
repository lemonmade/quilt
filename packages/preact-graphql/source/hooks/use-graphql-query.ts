import {useMemo} from 'preact/hooks';
import {
  GraphQLQuery,
  toGraphQLSource,
  type GraphQLFetch,
  type GraphQLAnyOperation,
} from '@quilted/graphql';
import type {ReadonlySignal} from '@quilted/preact-signals';
import {
  useAsync,
  useAsyncActionCache,
  type UseAsyncActionOptions,
} from '@quilted/preact-async';

import {useGraphQLFetch} from './use-graphql-fetch.ts';

export function useGraphQLQuery<Data, Variables>(
  query: GraphQLAnyOperation<Data, Variables>,
  {
    variables,
    tags,
    signal,
    suspend,
    active: explicitActive,
    cache: explicitCache,
    fetch: explicitFetch,
  }: {
    fetch?: GraphQLFetch<any>;
    variables?: Variables | ReadonlySignal<Variables>;
  } & Pick<
    UseAsyncActionOptions<Data, Variables>,
    'active' | 'signal' | 'suspend' | 'cache' | 'tags'
  > = {},
) {
  const fetchFromContext = useGraphQLFetch({optional: true});
  const fetch = explicitFetch ?? fetchFromContext;

  if (fetch == null) {
    throw new Error('No GraphQL fetch function provided.');
  }

  const cacheFromContext = useAsyncActionCache({
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

  const queryAction = useMemo(
    () =>
      cache
        ? cache.create((cached) => new GraphQLQuery(query, {fetch, cached}), {
            key: `query:${
              typeof query === 'string'
                ? query
                : 'id' in query
                  ? query.id
                  : toGraphQLSource(query)
            }`,
            tags,
          })
        : new GraphQLQuery(query, {fetch}),
    [query, fetch, cache],
  );

  const active =
    explicitActive ?? (typeof document === 'object' || Boolean(cache));

  useAsync(queryAction, {input: variables, active, signal, suspend});

  return queryAction;
}
