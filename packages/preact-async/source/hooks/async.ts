import {useRef, useEffect} from 'preact/hooks';

import {AsyncAction} from '@quilted/async';
import type {
  AsyncActionCache,
  AsyncActionCacheKey,
  AsyncActionCacheEntry,
  AsyncActionRunCache,
  AsyncActionCacheCreateOptions,
  AsyncActionFunction,
} from '@quilted/async';
import {
  isSignal,
  useSignal,
  useComputed,
  useSignalEffect,
  type ReadonlySignal,
} from '@quilted/preact-signals';

import {AsyncActionCacheContext} from '../context.ts';

export interface UseAsyncActionOptions<Data = unknown, Input = unknown>
  extends Pick<AsyncActionCacheCreateOptions, 'tags'> {
  readonly input?: Input | ReadonlySignal<Input>;
  readonly key?: AsyncActionCacheKey | ReadonlySignal<AsyncActionCacheKey>;
  readonly active?: boolean | ReadonlySignal<boolean>;
  readonly suspend?: boolean;
  readonly cache?: boolean | AsyncActionCache;
  readonly cached?: AsyncActionRunCache<Data, Input>;
  readonly signal?: AbortSignal;
}

export function useAsync<Data = unknown, Input = unknown>(
  asyncActionFunction: AsyncActionFunction<Data, Input>,
  options?: Omit<UseAsyncActionOptions<Data, Input>, 'cache'> & {
    cache?: true | AsyncActionCache;
  },
): AsyncActionCacheEntry<AsyncAction<Data, Input>>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncAction: AsyncAction<Data, Input>,
  options?: Pick<
    UseAsyncActionOptions<Data, Input>,
    'input' | 'active' | 'suspend' | 'signal'
  >,
): AsyncAction<Data, Input>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncActionFunction: AsyncActionFunction<Data, Input>,
  options?: UseAsyncActionOptions<Data, Input>,
): AsyncAction<Data, Input> | AsyncActionCacheEntry<AsyncAction<Data, Input>>;
export function useAsync<Data = unknown, Input = unknown>(
  asyncAction: AsyncAction<Data, Input> | AsyncActionFunction<Data, Input>,
  {
    key,
    tags,
    cache = true,
    // Don’t run fetches on the server if the value did not come from a cache
    active = typeof document === 'object' || Boolean(cache),
    suspend = true,
    input,
    signal,
    cached,
  }: UseAsyncActionOptions<Data, Input> = {},
) {
  const internalsRef = useRef<
    Pick<UseAsyncActionOptions<Data, Input>, 'tags' | 'signal' | 'cached'> & {
      function?: AsyncActionFunction<Data, Input>;
    }
  >();
  internalsRef.current ??= {};
  Object.assign(internalsRef.current, {
    tags,
    signal,
    cached,
    function: typeof asyncAction === 'function' ? asyncAction : undefined,
  });

  const keySignal = useMaybeSignal(key);
  const activeSignal = useMaybeSignal(active);
  const inputSignal = useMaybeSignal(input);

  const asyncCacheFromContext = AsyncActionCacheContext.use({optional: true});

  const actionSignal = useComputed(() => {
    if (typeof asyncAction !== 'function') {
      return asyncAction;
    }

    const shouldCache = Boolean(cache ?? true);
    const asyncCache = shouldCache
      ? cache != null && typeof cache !== 'boolean'
        ? cache
        : asyncCacheFromContext
      : undefined;

    if (shouldCache && asyncCache == null) {
      throw new Error(`Missing AsyncActionCache`);
    }

    const resolvedFetchFunction: AsyncActionFunction<Data, Input> = (...args) =>
      internalsRef.current!.function?.(...args) as any;

    const key = keySignal.value;

    if (asyncCache == null) {
      return new AsyncAction<Data, Input>(resolvedFetchFunction);
    }

    return asyncCache.create(
      (cached) =>
        new AsyncAction(resolvedFetchFunction, {
          cached: internalsRef.current!.cached ?? cached,
        }),
      {key, tags: internalsRef.current!.tags},
    );
  });

  if (
    suspend &&
    activeSignal.value &&
    actionSignal.value.status === 'pending'
  ) {
    const action = actionSignal.value;

    if (action.isRunning) throw action.promise;

    throw action.run(inputSignal.peek(), {signal});
  }

  const actionToRun = useComputed(() => {
    if (!activeSignal.value) return;

    const action = actionSignal.value;
    const resolvedInput = inputSignal.value;

    if (
      action.hasChanged(resolvedInput) ||
      (action.status === 'pending' && !action.isRunning)
    ) {
      return {action, input: resolvedInput};
    }
  });

  useSignalEffect(() => {
    const {action, input} = actionToRun.value ?? {};

    if (action == null) return;

    action
      .run(input, {
        signal: internalsRef.current!.signal,
      })
      .catch(() => {});
  });

  const action = actionSignal.value;

  useEffect(() => {
    const actionAsCacheEntry =
      'watchers' in action && typeof action.watchers === 'number'
        ? action
        : undefined;

    if (actionAsCacheEntry) actionAsCacheEntry.watchers += 1;

    return () => {
      if (actionAsCacheEntry) {
        actionAsCacheEntry.watchers -= 1;
        if (actionAsCacheEntry.watchers > 0) return;
      }

      // TODO: don’t abort if there are other listeners?
      action.running?.abort();
    };
  }, [action]);

  return action;
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
