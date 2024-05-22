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
  isSignal,
  useSignal,
  useComputed,
  useSignalEffect,
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
  options?: Omit<UseAsyncFetchOptions<Data, Input>, 'cache' | 'tags'> & {
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
    cache = true,
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

  const keySignal = useMaybeSignal(key);
  const activeSignal = useMaybeSignal(active);
  const inputSignal = useMaybeSignal(input);

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

  if (suspend && activeSignal.value && fetchSignal.value.status === 'pending') {
    const fetch = fetchSignal.value;

    if (fetch.isRunning) throw fetch.promise;

    throw fetch.fetch(inputSignal.peek(), {signal});
  }

  const actionToRun = useComputed(() => {
    if (!activeSignal.value) return;

    const fetch = fetchSignal.value;
    const resolvedInput = inputSignal.value;

    if (
      fetch.latest.input !== resolvedInput ||
      (fetch.status === 'pending' && !fetch.isRunning)
    ) {
      return {fetch, input: resolvedInput};
    }
  });

  useSignalEffect(() => {
    const action = actionToRun.value;

    if (action == null) return;

    const {fetch, input} = action;

    fetch
      .fetch(input, {
        signal: internalsRef.current!.signal,
      })
      .catch(() => {});
  });

  return fetchSignal.value;
}

// Limitation: can’t change from a signal to not a signal
function useMaybeSignal<T>(value: T | ReadonlySignal<T>) {
  if (isSignal(value)) {
    return value;
  } else {
    const signal = useSignal(value);
    signal.value = value;
    return signal as ReadonlySignal<T>;
  }
}
