import {useRef} from 'preact/hooks';

import {AsyncFetch} from '@quilted/async';
import type {
  AsyncFetchCacheGetOptions,
  AsyncFetchFunction,
} from '@quilted/async';
import {
  useComputed,
  resolveSignalOrValue,
  type Signal,
} from '@quilted/preact-signals';

import {AsyncFetchCacheContext} from '../context.ts';

export const useAsyncFetchCache = AsyncFetchCacheContext.use;

export interface UseAsyncFetchOptions<Data = unknown, Input = unknown>
  extends Pick<AsyncFetchCacheGetOptions<Data, Input>, 'tags'> {
  readonly key?: unknown | Signal<unknown>;
  readonly defer?: boolean;
}

export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input>,
  options?: Pick<UseAsyncFetchOptions<Data, Input>, 'defer'>,
): AsyncFetch<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: UseAsyncFetchOptions<Data, Input>,
): AsyncFetch<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input> | AsyncFetchFunction<Data, Input>,
  options?: UseAsyncFetchOptions<Data, Input>,
) {
  const functionRef = useRef<AsyncFetchFunction<Data, Input>>();
  if (typeof asyncFetch === 'function') functionRef.current = asyncFetch;

  const fetchCache = useAsyncFetchCache({optional: true});

  const fetchSignal = useComputed(() => {
    if (typeof asyncFetch !== 'function') {
      return asyncFetch;
    }

    const resolvedFetchFunction: AsyncFetchFunction<Data, Input> = (...args) =>
      functionRef.current!(...args);

    if (fetchCache == null || options?.key == null) {
      return new AsyncFetch<Data, Input>(resolvedFetchFunction);
    }

    const key = resolveSignalOrValue(options.key);

    return fetchCache.get(resolvedFetchFunction, {...options, key});
  }, [fetchCache]);

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
