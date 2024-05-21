import {useRef} from 'preact/hooks';

import {AsyncFetch} from '@quilted/async';
import type {
  AsyncFetchCache,
  AsyncFetchCacheEntry,
  AsyncFetchCacheGetOptions,
  AsyncFetchFunction,
} from '@quilted/async';
import {useSignal, useComputed, type Signal} from '@quilted/preact-signals';

import {AsyncFetchCacheContext} from '../context.ts';

export const useAsyncFetchCache = AsyncFetchCacheContext.use;

export interface UseAsyncFetchOptions<Data = unknown, Input = unknown>
  extends Pick<AsyncFetchCacheGetOptions<Data, Input>, 'tags'> {
  readonly key?: unknown | Signal<unknown>;
  readonly defer?: boolean;
  readonly cache?: boolean | AsyncFetchCache;
}

export function useAsync<Data = unknown, Input = unknown>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: Omit<UseAsyncFetchOptions<Data, Input>, 'cache'> & {
    cache?: true | AsyncFetchCache;
  },
): AsyncFetchCacheEntry<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: Omit<UseAsyncFetchOptions<Data, Input>, 'cache'>,
): AsyncFetch<Data, Input> | AsyncFetchCacheEntry<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input>,
  options?: Pick<UseAsyncFetchOptions<Data, Input>, 'defer'>,
): AsyncFetch<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input> | AsyncFetchFunction<Data, Input>,
  options?: UseAsyncFetchOptions<Data, Input>,
) {
  const functionRef = useRef<AsyncFetchFunction<Data, Input>>();
  if (typeof asyncFetch === 'function') functionRef.current = asyncFetch;

  const keySignal = useSignal(options?.key);
  keySignal.value = options?.key;

  const fetchCacheFromContext = useAsyncFetchCache({optional: true});

  const fetchSignal = useComputed(() => {
    if (typeof asyncFetch !== 'function') {
      return asyncFetch;
    }

    const shouldCache = Boolean(options?.cache ?? true);
    const fetchCache = shouldCache
      ? options?.cache != null && typeof options.cache !== 'boolean'
        ? options.cache
        : fetchCacheFromContext
      : undefined;

    if (shouldCache && fetchCache == null) {
      throw new Error(`Missing AsyncFetchCache`);
    }

    const resolvedFetchFunction: AsyncFetchFunction<Data, Input> = (...args) =>
      functionRef.current!(...args);

    const key = keySignal.value;

    if (fetchCache == null) {
      return new AsyncFetch<Data, Input>(resolvedFetchFunction);
    }

    return fetchCache.get(resolvedFetchFunction, {...options, key});
  });

  const fetch = fetchSignal.value;
  const defer = options?.defer ?? false;

  const shouldFetch =
    fetch.status === 'pending' &&
    !defer &&
    // Don’t run fetches on the server if the value did not come from a cache
    (typeof document === 'object' || 'key' in fetch);

  if (shouldFetch) {
    if (fetch.isRunning) throw fetch.promise;
    throw fetch.call();
  }

  return fetch;
}
