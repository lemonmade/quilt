import {
  AsyncAction,
  type AsyncActionStatus,
  type AsyncActionFunction,
  type AsyncActionRunCache,
} from './AsyncAction.ts';

const EMPTY_ARRAY = Object.freeze([]);

export type AsyncActionCacheKey = unknown | readonly unknown[];

export interface AsyncActionCacheGetOptions<_Data = unknown, _Input = unknown> {
  readonly key?: AsyncActionCacheKey;
  readonly tags?: readonly string[];
}

export interface AsyncActionCacheFindOptions<
  _Data = unknown,
  _Input = unknown,
> {
  readonly key?: AsyncActionCacheKey;
  readonly tags?: readonly string[];
  readonly status?: AsyncActionStatus | readonly AsyncActionStatus[];
}

export class AsyncActionCache {
  private readonly cache: Map<string, AsyncActionCacheEntry<any, any>>;
  private readonly initialCache: Map<string, AsyncActionRunCache<any, any>>;
  private anonymousFetchCount = 0;

  constructor(
    initialCache: Iterable<
      AsyncActionCacheEntrySerialization<any>
    > = EMPTY_ARRAY,
  ) {
    this.cache = new Map();
    this.initialCache = new Map();

    for (const [key, value] of initialCache) {
      this.initialCache.set(key, value);
    }
  }

  get = <Data = unknown, Input = unknown>(
    fetchFunction: AsyncActionFunction<Data, Input>,
    {key, tags = EMPTY_ARRAY}: AsyncActionCacheGetOptions<Data, Input> = {},
  ): AsyncActionCacheEntry<Data, Input> => {
    let resolvedKey = key;

    if (resolvedKey == null) {
      resolvedKey = `_anonymous:${this.anonymousFetchCount}`;
      this.anonymousFetchCount += 1;
    }

    const id = stringifyCacheKey(resolvedKey);

    let cacheEntry = this.cache.get(id);

    if (cacheEntry) return cacheEntry;

    cacheEntry = new AsyncActionCacheEntry<Data, Input>(fetchFunction, {
      id,
      key: resolvedKey,
      tags,
      cached: this.initialCache.get(id),
    });

    this.cache.set(id, cacheEntry);

    return cacheEntry;
  };

  run = <Data = unknown, Input = unknown>(
    fetchFunction: AsyncActionFunction<Data, Input>,
    {
      key,
      input,
      signal,
      tags = EMPTY_ARRAY,
    }: {input?: Input; signal?: AbortSignal} & AsyncActionCacheGetOptions<
      Data,
      Input
    > = {},
  ) => {
    const entry = this.get(fetchFunction, {key, tags});
    entry.run(input, {signal});
    return entry.promise;
  };

  find<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions<Data, Input>
      | ((entry: AsyncActionCacheEntry<Data, Input>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].find(predicate) as
      | AsyncActionCacheEntry<Data, Input>
      | undefined;
  }

  filter<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions<Data, Input>
      | ((entry: AsyncActionCacheEntry<Data, Input>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].filter(predicate) as AsyncActionCacheEntry<
      Data,
      Input
    >[];
  }

  delete<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions<Data, Input>
      | ((entry: AsyncActionCacheEntry<Data, Input>) => boolean),
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

  restore(entries: Iterable<AsyncActionCacheEntrySerialization<any>>) {
    for (const [key, value] of entries) {
      this.initialCache.set(key, value);
    }
  }

  serialize(): readonly AsyncActionCacheEntrySerialization<any>[] {
    const serialized: AsyncActionCacheEntrySerialization<any>[] = [];

    for (const entry of this.cache.values()) {
      const serializedEntry = entry.serialize();
      if (serializedEntry) serialized.push(serializedEntry);
    }

    return serialized;
  }
}

function createCachePredicate(
  optionsOrPredicate:
    | AsyncActionCacheFindOptions<any, any>
    | ((entry: AsyncActionCacheEntry<any, any>) => boolean),
) {
  if (typeof optionsOrPredicate === 'function') return optionsOrPredicate;

  const {key, tags, status} = optionsOrPredicate;

  const id = key ? stringifyCacheKey(key) : undefined;
  const statuses =
    status != null && typeof status === 'string' ? [status] : status;

  return (entry: AsyncActionCacheEntry<any, any>) => {
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

export class AsyncActionCacheEntry<
  Data = unknown,
  Input = unknown,
> extends AsyncAction<Data, Input> {
  readonly id: string;
  readonly key: AsyncActionCacheKey;
  readonly tags: readonly string[];

  constructor(
    fetchFunction: AsyncActionFunction<Data, Input>,
    {
      id,
      key,
      cached,
      tags = EMPTY_ARRAY,
    }: {
      id: string;
      cached?: AsyncActionRunCache<Data, Input>;
    } & Pick<AsyncActionCacheGetOptions<Data, Input>, 'tags' | 'key'>,
  ) {
    super(fetchFunction, {cached});

    this.id = id;
    this.key = key;
    this.tags = tags;
  }

  serialize(): AsyncActionCacheEntrySerialization<Data, Input> | undefined {
    const serialized = this.finished?.serialize();
    return serialized && [this.id, serialized];
  }
}

export type AsyncActionCacheEntrySerialization<
  Data = unknown,
  Input = unknown,
> = [key: string, result: AsyncActionRunCache<Data, Input>];

function stringifyCacheKey(key: AsyncActionCacheKey): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}
