import {useRef} from 'preact/hooks';

import {AsyncFetch} from '@quilted/async';
import type {
  AsyncFetchCacheGetOptions,
  AsyncFetchFunction,
} from '@quilted/async';
import {useComputed} from '@quilted/preact-signals';

import {AsyncFetchCacheContext} from '../context.ts';

export const useAsyncFetchCache = AsyncFetchCacheContext.use;

export function useAsyncFetch<Data, Input>(
  asyncFetch: AsyncFetch<Data, Input>,
): AsyncFetch<Data, Input>;
export function useAsyncFetch<Data, Input>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: AsyncFetchCacheGetOptions<Data, Input>,
): AsyncFetch<Data, Input>;
export function useAsyncFetch<Data, Input>(
  asyncFetch: AsyncFetch<Data, Input> | AsyncFetchFunction<Data, Input>,
  options?: AsyncFetchCacheGetOptions<Data, Input>,
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

    // TODO: react to key changes
    return fetchCache.get(resolvedFetchFunction, options);
  }, [fetchCache]);

  const fetch = fetchSignal.value;

  if (fetch.status === 'pending') {
    if (fetch.isRunning) throw fetch.promise;
    throw fetch.call();
  }

  return fetch;
}
