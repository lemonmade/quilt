import {
  AsyncFetch,
  type AsyncFetchStatus,
  type AsyncFetchFunction,
  type AsyncFetchCallCache,
} from './AsyncFetch.ts';

const EMPTY_ARRAY = Object.freeze([]);

export type AsyncFetchCacheKey = unknown | readonly unknown[];

export interface AsyncFetchCacheGetOptions<_Data = unknown, _Input = unknown> {
  readonly key?: AsyncFetchCacheKey;
  readonly tags?: readonly string[];
}

export interface AsyncFetchCacheFindOptions<_Data = unknown, _Input = unknown> {
  readonly key?: AsyncFetchCacheKey;
  readonly tags?: readonly string[];
  readonly status?: AsyncFetchStatus | readonly AsyncFetchStatus[];
}

export class AsyncFetchCache {
  private readonly cache: Map<string, AsyncFetchCacheEntry<any, any>>;
  private readonly initialCache: Map<string, AsyncFetchCallCache<any, any>>;
  private anonymousFetchCount = 0;

  constructor(
    initialCache: Iterable<
      AsyncFetchCacheEntrySerialization<any>
    > = EMPTY_ARRAY,
  ) {
    this.cache = new Map();
    this.initialCache = new Map();

    for (const [key, value] of initialCache) {
      this.initialCache.set(key, value);
    }
  }

  get = <Data = unknown, Input = unknown>(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {key, tags = EMPTY_ARRAY}: AsyncFetchCacheGetOptions<Data, Input> = {},
  ): AsyncFetchCacheEntry<Data, Input> => {
    let resolvedKey = key;

    if (resolvedKey == null) {
      resolvedKey = `_anonymous:${this.anonymousFetchCount}`;
      this.anonymousFetchCount += 1;
    }

    const id = stringifyCacheKey(resolvedKey);

    let cacheEntry = this.cache.get(id);

    if (cacheEntry) return cacheEntry;

    cacheEntry = new AsyncFetchCacheEntry<Data, Input>(fetchFunction, {
      id,
      key: resolvedKey,
      tags,
      cached: this.initialCache.get(id),
    });

    this.cache.set(id, cacheEntry);

    return cacheEntry;
  };

  fetch = <Data = unknown, Input = unknown>(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {
      key,
      input,
      signal,
      tags = EMPTY_ARRAY,
    }: {input?: Input; signal?: AbortSignal} & AsyncFetchCacheGetOptions<
      Data,
      Input
    > = {},
  ) => {
    const entry = this.get(fetchFunction, {key, tags});
    entry.fetch(input, {signal});
    return entry.promise;
  };

  find<Data = unknown, Input = unknown>(
    options:
      | AsyncFetchCacheFindOptions<Data, Input>
      | ((entry: AsyncFetchCacheEntry<Data, Input>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].find(predicate) as
      | AsyncFetchCacheEntry<Data, Input>
      | undefined;
  }

  filter<Data = unknown, Input = unknown>(
    options:
      | AsyncFetchCacheFindOptions<Data, Input>
      | ((entry: AsyncFetchCacheEntry<Data, Input>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].filter(predicate) as AsyncFetchCacheEntry<
      Data,
      Input
    >[];
  }

  delete<Data = unknown, Input = unknown>(
    options:
      | AsyncFetchCacheFindOptions<Data, Input>
      | ((entry: AsyncFetchCacheEntry<Data, Input>) => boolean),
  ) {
    const predicate = createCachePredicate(options);

    for (const entry of this.cache.values()) {
      if (predicate(entry)) {
        this.cache.delete(entry.id);
        entry.running?.abort();
      }
    }
  }

  clear() {
    const entries = [...this.cache.values()];

    this.cache.clear();

    for (const entry of entries) {
      entry.running?.abort();
    }
  }

  *keys() {
    yield* this.cache.keys();
  }

  *values() {
    yield* this.cache.values();
  }

  *entries() {
    for (const entry of this.cache.values()) {
      yield [entry.key, entry] as const;
    }
  }

  restore(entries: Iterable<AsyncFetchCacheEntrySerialization<any>>) {
    for (const [key, value] of entries) {
      this.initialCache.set(key, value);
    }
  }

  serialize(): readonly AsyncFetchCacheEntrySerialization<any>[] {
    const serialized: AsyncFetchCacheEntrySerialization<any>[] = [];

    for (const entry of this.cache.values()) {
      const serializedEntry = entry.serialize();
      if (serializedEntry) serialized.push(serializedEntry);
    }

    return serialized;
  }
}

function createCachePredicate(
  optionsOrPredicate:
    | AsyncFetchCacheFindOptions<any, any>
    | ((entry: AsyncFetchCacheEntry<any, any>) => boolean),
) {
  if (typeof optionsOrPredicate === 'function') return optionsOrPredicate;

  const {key, tags, status} = optionsOrPredicate;

  const id = key ? stringifyCacheKey(key) : undefined;
  const statuses =
    status != null && typeof status === 'string' ? [status] : status;

  return (entry: AsyncFetchCacheEntry<any, any>) => {
    if (id != null && entry.id !== id) {
      return false;
    }

    if (tags != null && tags.length !== 0) {
      return tags.every((tag) => entry.tags.includes(tag));
    }

    if (statuses != null && !statuses.includes(entry.status)) {
      return false;
    }

    return true;
  };
}

export class AsyncFetchCacheEntry<
  Data = unknown,
  Input = unknown,
> extends AsyncFetch<Data, Input> {
  readonly id: string;
  readonly key: AsyncFetchCacheKey;
  readonly tags: readonly string[];

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {
      id,
      key,
      cached,
      tags = EMPTY_ARRAY,
    }: {
      id: string;
      cached?: AsyncFetchCallCache<Data, Input>;
    } & Pick<AsyncFetchCacheGetOptions<Data, Input>, 'tags' | 'key'>,
  ) {
    super(fetchFunction, {cached});

    this.id = id;
    this.key = key;
    this.tags = tags;
  }

  serialize(): AsyncFetchCacheEntrySerialization<Data, Input> | undefined {
    const serialized = this.finished?.serialize();
    return serialized && [this.id, serialized];
  }
}

export type AsyncFetchCacheEntrySerialization<
  Data = unknown,
  Input = unknown,
> = [key: string, result: AsyncFetchCallCache<Data, Input>];

function stringifyCacheKey(key: AsyncFetchCacheKey): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}
