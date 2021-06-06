import type {NoInfer} from '@quilted/useful-types';
import type {
  GraphQLResult,
  GraphQLFetch,
  GraphQLOperation,
  QueryOptions,
  GraphQLRequestContext,
  MutationOptions,
  IfAllVariablesOptional,
} from './types';
import {cacheKey as getCacheKey} from './utilities/cache';

export class GraphQL {
  private readonly inflight = new Map<string, Promise<any>>();

  constructor(
    private readonly fetch: GraphQLFetch,
    private readonly cache: Map<string, any> | false = new Map<string, any>(),
  ) {}

  read<Data, Variables>(
    queryOrKey: GraphQLOperation<Data, Variables> | string,
    variables?: Variables,
  ) {
    if (!this.cache) {
      return;
    }

    return this.cache.get(
      typeof queryOrKey === 'string'
        ? queryOrKey
        : getCacheKey(queryOrKey, variables),
    ) as Data | undefined;
  }

  mutate<Data, Variables>(
    mutation: GraphQLOperation<Data, Variables>,
    ...optionsPart: IfAllVariablesOptional<
      Variables,
      [MutationOptions<Data, NoInfer<Variables>>?],
      [MutationOptions<Data, NoInfer<Variables>>]
    >
  ) {
    return this.run(mutation, optionsPart[0]?.variables);
  }

  query<Data, Variables>(
    query: GraphQLOperation<Data, Variables>,
    ...optionsPart: IfAllVariablesOptional<
      Variables,
      [QueryOptions<Data, NoInfer<Variables>>?],
      [QueryOptions<Data, NoInfer<Variables>>]
    >
  ): Promise<GraphQLResult<Data>> {
    const options: QueryOptions<Data, Variables> =
      optionsPart[0] ?? ({} as any);

    const {cache = true, variables} = options;

    const cacheKey = getCacheKey(query, variables);

    if (options.cache && this.cache && this.cache.has(cacheKey))
      return Promise.resolve({data: this.cache.get(cacheKey)!});

    if (this.inflight.has(cacheKey)) return this.inflight.get(cacheKey)!;

    const promise = (async () => {
      try {
        const result = await this.run(query, variables);

        if (cache && this.cache && !result.error)
          this.cache.set(cacheKey, result.data);

        return result;
      } finally {
        this.inflight.delete(cacheKey);
      }
    })();

    this.inflight.set(cacheKey, promise);
    return promise;
  }

  private async run<Data, Variables>(
    operation: GraphQLOperation<Data, Variables>,
    variables?: Variables,
  ): Promise<GraphQLResult<Data>> {
    try {
      const data = (await this.fetch(
        {
          operation,
          variables: variables ?? {},
        },
        createContext(),
      )) as any as Data;

      return {data};
    } catch (error) {
      return {error};
    }
  }
}

export function createGraphQL({
  fetch,
  cache,
}: {
  fetch: GraphQLFetch;
  cache?: Map<string, any> | false;
}) {
  return new GraphQL(fetch, cache);
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
