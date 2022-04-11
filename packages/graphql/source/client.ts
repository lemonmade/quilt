import type {NoInfer, IfAllFieldsNullable} from '@quilted/useful-types';
import type {
  GraphQLResult,
  GraphQLFetch,
  GraphQLOperation,
  GraphQLQueryOptions,
  GraphQLRequestContext,
  GraphQLMutationOptions,
} from './types';
import {cacheKey as getCacheKey} from './utilities/cache';

export interface GraphQL {
  read<Data, Variables>(
    queryOrKey: GraphQLOperation<Data, Variables> | string,
    variables?: Variables,
  ): Data | undefined;
  mutate<Data, Variables>(
    mutation: GraphQLOperation<Data, Variables> | string,
    ...optionsPart: IfAllFieldsNullable<
      Variables,
      [GraphQLMutationOptions<Data, NoInfer<Variables>>?],
      [GraphQLMutationOptions<Data, NoInfer<Variables>>]
    >
  ): Promise<GraphQLResult<Data>>;
  query<Data, Variables>(
    query: GraphQLOperation<Data, Variables> | string,
    ...optionsPart: IfAllFieldsNullable<
      Variables,
      [GraphQLQueryOptions<Data, NoInfer<Variables>>?],
      [GraphQLQueryOptions<Data, NoInfer<Variables>>]
    >
  ): Promise<GraphQLResult<Data>>;
}

export function createGraphQL({
  fetch,
  cache = false,
}: {
  fetch: GraphQLFetch;
  cache?: Map<string, any> | false;
}): GraphQL {
  const inflight = new Map<string, Promise<any>>();

  return {
    read(queryOrKey, variables) {
      if (!cache) {
        return;
      }

      return cache.get(
        typeof queryOrKey === 'string'
          ? queryOrKey
          : getCacheKey(queryOrKey, variables),
      ) as any;
    },
    query(query, ...optionsPart) {
      const options = optionsPart[0] ?? ({} as any);

      const {cache: shouldCache = true, variables} =
        options as GraphQLQueryOptions<any, any>;

      const cacheKey = getCacheKey(query, variables);

      if (shouldCache && cache && cache.has(cacheKey))
        return Promise.resolve({data: cache.get(cacheKey)!});

      if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

      const promise = (async () => {
        try {
          const result = await run(query, variables);

          if (shouldCache && cache && !result.error) {
            cache.set(cacheKey, result.data);
          }

          return result;
        } finally {
          inflight.delete(cacheKey);
        }
      })();

      inflight.set(cacheKey, promise);
      return promise;
    },
    mutate(mutation, ...optionsPart) {
      return run(mutation, optionsPart[0]?.variables);
    },
  };

  async function run<Data, Variables>(
    operation: GraphQLOperation<Data, Variables> | string,
    variables?: Variables,
  ): Promise<GraphQLResult<Data>> {
    try {
      const data = (await fetch(
        {
          operation:
            typeof operation === 'string'
              ? {id: operation, source: operation}
              : operation,
          variables: variables ?? {},
        },
        createContext(),
      )) as any as Data;

      return {data};
    } catch (error) {
      return {error: error as Error};
    }
  }
}

function createContext(): GraphQLRequestContext<Record<string, any>> {
  const map = new Map<string, any>();

  return {
    has: (key) => map.has(key),
    get: (key) => map.get(key),
    delete: (key) => map.delete(key),
    set: (key, value) => map.set(key, value),
  };
}
