import {
  AsyncFetch,
  type AsyncFetchFunction,
  type AsyncFetchCallCache,
} from './AsyncFetch.ts';

const EMPTY_ARRAY = Object.freeze([]);

export interface AsyncFetchCacheGetOptions<_Data = unknown, _Input = unknown> {
  key?: unknown | readonly unknown[];
  tags?: readonly string[];
}

export class AsyncFetchCache {
  private readonly cache: Map<string, AsyncFetchCacheEntry<any, any>>;
  private readonly initialCache: Map<string, AsyncFetchCallCache<any, any>>;

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
    {
      key: explicitKey,
      tags = EMPTY_ARRAY,
    }: AsyncFetchCacheGetOptions<Data, Input> = {},
  ) => {
    const resolvedKey = explicitKey
      ? JSON.stringify(explicitKey)
      : fetchFunction.toString();

    let cacheEntry = this.cache.get(resolvedKey);

    if (cacheEntry) return cacheEntry;

    cacheEntry = new AsyncFetchCacheEntry<Data, Input>(fetchFunction, {
      key: resolvedKey,
      tags,
      cached: this.initialCache.get(resolvedKey),
    });

    this.cache.set(resolvedKey, cacheEntry);

    return cacheEntry;
  };

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

export class AsyncFetchCacheEntry<
  Data = unknown,
  Input = unknown,
> extends AsyncFetch<Data, Input> {
  readonly key: string;
  readonly tags: readonly string[];

  constructor(
    fetchFunction: AsyncFetchFunction<Data, Input>,
    {
      key,
      cached,
      tags = EMPTY_ARRAY,
    }: {
      key: string;
      cached?: AsyncFetchCallCache<Data, Input>;
    } & Omit<AsyncFetchCacheGetOptions<Data, Input>, 'key'>,
  ) {
    super(fetchFunction, {cached});

    this.key = key;
    this.tags = tags;
  }

  serialize(): AsyncFetchCacheEntrySerialization<Data, Input> | undefined {
    const serialized = this.finished?.serialize();
    return serialized && [this.key, serialized];
  }
}

export type AsyncFetchCacheEntrySerialization<
  Data = unknown,
  Input = unknown,
> = [key: string, result: AsyncFetchCallCache<Data, Input>];
