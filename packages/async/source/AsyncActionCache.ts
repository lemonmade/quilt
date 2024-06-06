import {
  AsyncAction,
  type AsyncActionStatus,
  type AsyncActionFunction,
  type AsyncActionRunCache,
} from './AsyncAction.ts';

const EMPTY_ARRAY = Object.freeze([]);

export type AsyncActionCacheKey = unknown | readonly unknown[];

export interface AsyncActionCacheCreateOptions {
  readonly key?: AsyncActionCacheKey;
  readonly tags?: readonly string[];
}

export interface AsyncActionCacheFindOptions {
  readonly key?: AsyncActionCacheKey;
  readonly tags?: readonly string[];
  readonly status?: AsyncActionStatus | readonly AsyncActionStatus[];
}

export class AsyncActionCache {
  readonly #cache: Map<string, AsyncActionCacheEntry<AsyncAction<any, any>>>;
  readonly #initialCache: Map<string, AsyncActionRunCache<any, any>>;
  #anonymousCount = 0;

  constructor(
    initialCache: Iterable<
      AsyncActionCacheEntrySerialization<any>
    > = EMPTY_ARRAY,
  ) {
    this.#cache = new Map();
    this.#initialCache = new Map();

    for (const [key, value] of initialCache) {
      this.#initialCache.set(key, value);
    }
  }

  create = <Action extends AsyncAction<any, any>>(
    create: (cached?: AsyncActionRunCache<any, any>) => Action,
    {key: explicitKey, tags = EMPTY_ARRAY}: AsyncActionCacheCreateOptions = {},
  ): AsyncActionCacheEntry<Action> => {
    const {id, key} = this.#resolveKey(explicitKey);
    let action = this.#cache.get(id) as
      | AsyncActionCacheEntry<Action>
      | undefined;
    if (action) return action;

    const initialCache = this.#initialCache.get(id);
    action = create(initialCache) as any as AsyncActionCacheEntry<Action>;

    Object.assign(action, {id, key, tags, watchers: 0});
    this.#cache.set(id, action);

    return action;
  };

  put = <Action extends AsyncAction<any, any>>(
    action: Action,
    {key: explicitKey, tags = EMPTY_ARRAY}: AsyncActionCacheCreateOptions = {},
  ) => {
    const {id, key} = this.#resolveKey(explicitKey);
    Object.assign(action, {id, key, tags});
    this.#cache.set(id, action as AsyncActionCacheEntry<Action>);
    return action as AsyncActionCacheEntry<Action>;
  };

  get = <Data = unknown, Input = unknown>(
    key: AsyncActionCacheKey,
  ): AsyncActionCacheEntry<AsyncAction<Data, Input>> | undefined => {
    return this.#cache.get(stringifyCacheKey(key));
  };

  has = (key: AsyncActionCacheKey): boolean => {
    return this.#cache.has(stringifyCacheKey(key));
  };

  run = <Data = unknown, Input = unknown>(
    asyncFunction: AsyncActionFunction<Data, Input>,
    {
      key,
      input,
      signal,
      force,
      tags = EMPTY_ARRAY,
    }: {
      input?: Input;
      signal?: AbortSignal;
      force?: boolean;
    } & AsyncActionCacheCreateOptions = {},
  ) => {
    const entry = this.create(
      (cached) => new AsyncAction(asyncFunction, {cached}),
      {key, tags},
    );

    return entry.run(input, {signal, force});
  };

  find<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions
      | ((entry: AsyncActionCacheEntry<AsyncAction<Data, Input>>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].find(predicate) as
      | AsyncActionCacheEntry<AsyncAction<Data, Input>>
      | undefined;
  }

  filter<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions
      | ((entry: AsyncActionCacheEntry<AsyncAction<Data, Input>>) => boolean),
  ) {
    const predicate = createCachePredicate(options);
    return [...this.values()].filter(predicate) as AsyncActionCacheEntry<
      AsyncAction<Data, Input>
    >[];
  }

  delete<Data = unknown, Input = unknown>(
    options:
      | AsyncActionCacheFindOptions
      | ((entry: AsyncActionCacheEntry<AsyncAction<Data, Input>>) => boolean),
  ) {
    const predicate = createCachePredicate(options);

    for (const entry of this.#cache.values()) {
      if (predicate(entry)) {
        this.#cache.delete(entry.id);
        entry.running?.abort();
      }
    }
  }

  clear() {
    const entries = [...this.#cache.values()];

    this.#cache.clear();

    for (const entry of entries) {
      entry.running?.abort();
    }
  }

  *keys() {
    yield* this.#cache.keys();
  }

  *values() {
    yield* this.#cache.values();
  }

  *entries() {
    for (const entry of this.#cache.values()) {
      yield [entry.key, entry] as const;
    }
  }

  restore(entries: Iterable<AsyncActionCacheEntrySerialization<any>>) {
    for (const [key, value] of entries) {
      this.#initialCache.set(key, value);
    }
  }

  serialize(): readonly AsyncActionCacheEntrySerialization<any>[] {
    const serialized: AsyncActionCacheEntrySerialization<any>[] = [];

    for (const entry of this.#cache.values()) {
      const serializedEntry = serializeEntry(entry);
      if (serializedEntry) serialized.push(serializedEntry);
    }

    return serialized;
  }

  #resolveKey = (
    key?: AsyncActionCacheKey,
  ): {id: string; key: AsyncActionCacheKey} => {
    let resolvedKey = key;

    if (resolvedKey == null) {
      resolvedKey = `_anonymous:${this.#anonymousCount}`;
      this.#anonymousCount += 1;
    }

    const id = stringifyCacheKey(resolvedKey);

    return {key, id};
  };
}

function serializeEntry<Data = unknown, Input = unknown>(
  action: AsyncActionCacheEntry<AsyncAction<Data, Input>>,
): AsyncActionCacheEntrySerialization<Data, Input> | undefined {
  const serialized = action.finished?.serialize();
  return serialized && [action.id, serialized];
}

function createCachePredicate(
  optionsOrPredicate:
    | AsyncActionCacheFindOptions
    | ((entry: AsyncActionCacheEntry<AsyncAction<any, any>>) => boolean),
) {
  if (typeof optionsOrPredicate === 'function') return optionsOrPredicate;

  const {key, tags, status} = optionsOrPredicate;

  const id = key ? stringifyCacheKey(key) : undefined;
  const statuses =
    status != null && typeof status === 'string' ? [status] : status;

  return (entry: AsyncActionCacheEntry<AsyncAction<any, any>>) => {
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

export type AsyncActionCacheEntry<
  Action extends AsyncAction<any, any> = AsyncAction<unknown, unknown>,
> = Action & {
  readonly id: string;
  readonly key: AsyncActionCacheKey;
  readonly tags: readonly string[];
  watchers: number;
};

export type AsyncActionCacheEntrySerialization<
  Data = unknown,
  Input = unknown,
> = [key: string, result: AsyncActionRunCache<Data, Input>];

function stringifyCacheKey(key: AsyncActionCacheKey): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}
