import {
  AsyncActionCache,
  AsyncActionCacheEntry,
  type AsyncActionCacheKey,
  type AsyncActionCacheFindOptions,
  type AsyncActionCacheCreateOptions,
  type AsyncActionCacheEntrySerialization,
} from '@quilted/async';

import type {GraphQLAnyOperation, GraphQLRun} from './types.ts';
import {toGraphQLSource} from './operation.ts';
import {GraphQLQuery} from './GraphQLQuery.ts';

export interface GraphQLCacheFindOptions
  extends Omit<AsyncActionCacheFindOptions, 'key'> {}

export class GraphQLCache {
  readonly #fetch?: GraphQLRun<any, any>;
  readonly #cache: AsyncActionCache;

  constructor({
    fetch,
    initial,
  }: {
    fetch?: GraphQLRun<any, any>;
    initial?: Iterable<AsyncActionCacheEntrySerialization<any>>;
  } = {}) {
    this.#fetch = fetch;
    this.#cache = new AsyncActionCache(initial);
  }

  query = <Data = unknown, Variables = unknown>(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      variables,
      signal,
      force,
      fetch: explicitFetch,
      key,
      tags,
    }: NoInfer<
      {
        variables?: Variables;
        signal?: AbortSignal;
        force?: boolean;
        fetch?: GraphQLRun<any, any>;
      } & AsyncActionCacheCreateOptions
    > = {},
  ) => {
    const entry = this.#cache.create(
      (cached) =>
        new GraphQLQuery(operation, {
          cached,
          fetch: explicitFetch ?? this.#fetch,
        }),
      {key: stringifyKey(operation, key), tags},
    );

    return entry.run(variables, {signal, force});
  };

  run = this.query;
  fetch = this.query;

  create = <Data = unknown, Variables = unknown>(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch: explicitFetch,
      key,
      tags,
    }: {
      fetch?: GraphQLRun<any, any>;
    } & AsyncActionCacheCreateOptions = {},
  ): AsyncActionCacheEntry<GraphQLQuery<Data, Variables>> => {
    const entry = this.#cache.create(
      (cached) =>
        new GraphQLQuery(operation, {
          cached,
          fetch: explicitFetch ?? this.#fetch,
        }),
      {key: stringifyKey(operation, key), tags},
    );

    return entry;
  };

  put = <Data = unknown, Variables = unknown>(
    query: GraphQLQuery<Data, Variables>,
    {tags}: AsyncActionCacheCreateOptions = {},
  ) => {
    return this.#cache.put(query, {
      tags,
      key: stringifyKey(query.operation),
    }) as AsyncActionCacheEntry<GraphQLQuery<Data, Variables>>;
  };

  get = <Data = unknown, Variables = unknown>(
    operation: GraphQLAnyOperation<Data, Variables>,
  ): AsyncActionCacheEntry<GraphQLQuery<Data, Variables>> | undefined => {
    return this.#cache.get(stringifyKey(operation)) as AsyncActionCacheEntry<
      GraphQLQuery<Data, Variables>
    >;
  };

  has = (operation: GraphQLAnyOperation<any, any>): boolean => {
    return this.#cache.has(stringifyKey(operation));
  };

  find<Data = unknown, Variables = unknown>(
    options:
      | GraphQLAnyOperation<Data, Variables>
      | AsyncActionCacheFindOptions
      | ((
          entry: AsyncActionCacheEntry<GraphQLQuery<Data, Variables>>,
        ) => boolean),
  ) {
    return this.#cache.find(createCachePredicate(options));
  }

  filter<Data = unknown, Variables = unknown>(
    options:
      | GraphQLAnyOperation<Data, Variables>
      | AsyncActionCacheFindOptions
      | ((
          entry: AsyncActionCacheEntry<GraphQLQuery<Data, Variables>>,
        ) => boolean),
  ) {
    return this.#cache.filter(createCachePredicate(options));
  }

  delete<Data = unknown, Variables = unknown>(
    options:
      | GraphQLAnyOperation<Data, Variables>
      | AsyncActionCacheFindOptions
      | ((
          entry: AsyncActionCacheEntry<GraphQLQuery<Data, Variables>>,
        ) => boolean),
  ) {
    this.#cache.delete(createCachePredicate(options));
  }

  clear() {
    this.#cache.clear();
  }

  *keys() {
    yield* this.#cache.keys();
  }

  *values() {
    yield* this.#cache.values();
  }

  *entries() {
    yield* this.#cache.entries();
  }

  restore(entries: Iterable<AsyncActionCacheEntrySerialization<any>>) {
    this.#cache.restore(entries);
  }

  serialize(): readonly AsyncActionCacheEntrySerialization<any>[] {
    return this.#cache.serialize();
  }
}

function stringifyKey(
  operation: GraphQLAnyOperation<any, any>,
  key?: AsyncActionCacheKey,
) {
  const operationKey =
    typeof operation === 'string'
      ? operation
      : 'id' in operation
        ? operation.id
        : toGraphQLSource(operation);

  return key ? [operationKey, key].flat(1) : operationKey;
}

function createCachePredicate<Data = unknown, Variables = unknown>(
  predicate:
    | GraphQLAnyOperation<Data, Variables>
    | (AsyncActionCacheFindOptions & {
        operation?: GraphQLAnyOperation<Data, Variables>;
      })
    | ((
        entry: AsyncActionCacheEntry<GraphQLQuery<Data, Variables>>,
      ) => boolean),
) {
  if (
    typeof predicate === 'string' ||
    'id' in predicate ||
    'kind' in predicate
  ) {
    return {key: stringifyKey(predicate)};
  } else if ('operation' in predicate && predicate.operation != null) {
    const {operation, key, ...rest} = predicate;

    return {
      key: stringifyKey(operation, key),
      ...rest,
    };
  }

  return predicate as
    | AsyncActionCacheFindOptions
    | ((entry: AsyncActionCacheEntry<any>) => boolean);
}
