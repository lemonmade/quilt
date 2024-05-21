import {useRef} from 'preact/hooks';

import {AsyncFetch} from '@quilted/async';
import type {
  AsyncFetchCache,
  AsyncFetchCacheKey,
  AsyncFetchCacheEntry,
  AsyncFetchCacheGetOptions,
  AsyncFetchFunction,
} from '@quilted/async';
import {
  useSignal,
  useComputed,
  useSignalEffect,
  resolveSignalOrValue,
  type ReadonlySignal,
} from '@quilted/preact-signals';

import {AsyncFetchCacheContext} from '../context.ts';

export const useAsyncFetchCache = AsyncFetchCacheContext.use;

export interface UseAsyncFetchOptions<Data = unknown, Input = unknown>
  extends Pick<AsyncFetchCacheGetOptions<Data, Input>, 'tags'> {
  readonly input?: Input | ReadonlySignal<Input>;
  readonly key?: AsyncFetchCacheKey | ReadonlySignal<AsyncFetchCacheKey>;
  readonly active?: boolean | ReadonlySignal<boolean>;
  readonly suspend?: boolean;
  readonly cache?: boolean | AsyncFetchCache;
  readonly signal?: AbortSignal;
}

export function useAsync<Data = unknown, Input = unknown>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: Omit<UseAsyncFetchOptions<Data, Input>, 'cache'> & {
    cache?: true | AsyncFetchCache;
  },
): AsyncFetchCacheEntry<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetchFunction: AsyncFetchFunction<Data, Input>,
  options?: UseAsyncFetchOptions<Data, Input>,
): AsyncFetch<Data, Input> | AsyncFetchCacheEntry<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input>,
  options?: Pick<UseAsyncFetchOptions<Data, Input>, 'input' | 'suspend'>,
): AsyncFetch<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncFetch: AsyncFetch<Data, Input> | AsyncFetchFunction<Data, Input>,
  {
    key,
    tags,
    cache,
    // Don’t run fetches on the server if the value did not come from a cache
    active = typeof document === 'object' || Boolean(cache),
    suspend = true,
    input,
    signal,
  }: UseAsyncFetchOptions<Data, Input> = {},
) {
  const internalsRef = useRef<
    Pick<UseAsyncFetchOptions<Data, Input>, 'tags' | 'signal'> & {
      function?: AsyncFetchFunction<Data, Input>;
    }
  >();
  if (internalsRef.current == null) internalsRef.current = {};
  Object.assign(internalsRef.current, {
    tags,
    signal,
    function: typeof asyncFetch === 'function' ? asyncFetch : undefined,
  });

  const keySignal = useSignal(key);
  keySignal.value = key;

  const fetchCacheFromContext = useAsyncFetchCache({optional: true});

  const fetchSignal = useComputed(() => {
    if (typeof asyncFetch !== 'function') {
      return asyncFetch;
    }

    const shouldCache = Boolean(cache ?? true);
    const fetchCache = shouldCache
      ? cache != null && typeof cache !== 'boolean'
        ? cache
        : fetchCacheFromContext
      : undefined;

    if (shouldCache && fetchCache == null) {
      throw new Error(`Missing AsyncFetchCache`);
    }

    const resolvedFetchFunction: AsyncFetchFunction<Data, Input> = (...args) =>
      internalsRef.current!.function?.(...args) as any;

    const key = keySignal.value;

    if (fetchCache == null) {
      return new AsyncFetch<Data, Input>(resolvedFetchFunction);
    }

    return fetchCache.get(resolvedFetchFunction, {
      key,
      tags: internalsRef.current!.tags,
    });
  });

  const fetch = fetchSignal.value;

  const shouldFetch =
    resolveSignalOrValue(active) && fetch.status === 'pending';

  if (shouldFetch && suspend) {
    if (fetch.isRunning) throw fetch.promise;

    const resolvedInput = resolveSignalOrValue(input, {peek: true});

    throw fetch.fetch(resolvedInput, {signal});
  }

  useSignalEffect(() => {
    if (!resolveSignalOrValue(active)) return;

    const fetch = fetchSignal.value;
    const resolvedInput = resolveSignalOrValue(input);

    if (fetch.latest.input !== resolvedInput) {
      fetch
        .fetch(resolvedInput, {
          signal: internalsRef.current!.signal,
        })
        .catch(() => {});
    }
  }, [active]);

  return fetch;
}
