import type {NoInfer} from '@quilted/useful-types';
import type {
  Result,
  GraphQLFetch,
  GraphQLDocument,
  QueryOptions,
  MutationOptions,
  IfAllVariablesOptional,
} from './types';
import {cacheKey as getCacheKey} from './utilities';

export class GraphQL {
  private readonly inflight = new Map<string, Promise<any>>();

  constructor(
    private readonly fetch: GraphQLFetch,
    private readonly cache = new Map<string, any>(),
  ) {}

  read<Data, Variables>(
    queryOrKey: GraphQLDocument<Data, Variables> | string,
    variables?: Variables,
  ) {
    return this.cache.get(
      typeof queryOrKey === 'string'
        ? queryOrKey
        : getCacheKey(queryOrKey, variables),
    ) as Data | undefined;
  }

  mutate<Data, Variables>(
    mutation: GraphQLDocument<Data, Variables>,
    ...optionsPart: IfAllVariablesOptional<
      Variables,
      [MutationOptions<Data, NoInfer<Variables>>?],
      [MutationOptions<Data, NoInfer<Variables>>]
    >
  ) {
    return this.run(mutation, optionsPart[0]?.variables);
  }

  query<Data, Variables>(
    query: GraphQLDocument<Data, Variables>,
    ...optionsPart: IfAllVariablesOptional<
      Variables,
      [QueryOptions<Data, NoInfer<Variables>>?],
      [QueryOptions<Data, NoInfer<Variables>>]
    >
  ): Promise<Result<Data>> {
    const options: QueryOptions<Data, Variables> =
      optionsPart[0] ?? ({} as any);

    const {cache = true, variables} = options;

    const cacheKey = getCacheKey(query, variables);

    if (options.cache && this.cache.has(cacheKey))
      return Promise.resolve({data: this.cache.get(cacheKey)!});

    if (this.inflight.has(cacheKey)) return this.inflight.get(cacheKey)!;

    const promise = (async () => {
      try {
        const result = await this.run(query, variables);

        if (cache && !result.error) this.cache.set(cacheKey, result.data);

        return result;
      } finally {
        this.inflight.delete(cacheKey);
      }
    })();

    this.inflight.set(cacheKey, promise);
    return promise;
  }

  private async run<Data, Variables>(
    document: GraphQLDocument<Data, Variables>,
    variables?: Variables,
  ): Promise<Result<Data>> {
    try {
      const data = ((await this.fetch({
        document,
        variables: variables ?? {},
      })) as any) as Data;

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
  cache?: Map<string, any>;
}) {
  return new GraphQL(fetch, cache);
}
