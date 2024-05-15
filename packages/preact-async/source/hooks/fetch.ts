import {useRef} from 'preact/hooks';

import {AsyncFetch} from '@quilted/async';
import type {
  AsyncFetchCacheGetOptions,
  AsyncFetchFunction,
} from '@quilted/async';
import {useComputed} from '@quilted/preact-signals';

import {AsyncFetchCacheContext} from '../context.ts';

export const useAsyncFetchCache = AsyncFetchCacheContext.use;

export async function useAsyncFetch<Data, Input>(
  fetchFunction: AsyncFetchFunction<Data, Input>,
  options?: AsyncFetchCacheGetOptions<Data, Input>,
) {
  const functionRef = useRef(fetchFunction);
  functionRef.current = fetchFunction;

  const fetchCache = useAsyncFetchCache({optional: true});

  const fetchSignal = useComputed(() => {
    const resolvedFetchFunction: AsyncFetchFunction<Data, Input> = (...args) =>
      functionRef.current(...args);

    if (!fetchCache) {
      return new AsyncFetch<Data, Input>(resolvedFetchFunction);
    }

    // TODO: react to key changes
    return fetchCache.get(resolvedFetchFunction, options);
  }, [fetchCache]);

  const fetch = fetchSignal.value;

  if (fetch.status === 'pending') {
    console.log(fetch.status, fetch.isRunning);
    if (fetch.isRunning) throw fetch.promise;
    throw fetch.call();
  }

  return fetch;
}
