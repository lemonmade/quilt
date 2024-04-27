import {useMemo} from 'react';
import {AsyncAction} from '@quilted/async';

export function useAsyncAction<T>(
  run: AsyncAction<T> | (() => PromiseLike<T>),
  {
    initial,
    signal,
    active = true,
  }: {initial?: T; active?: boolean; signal?: AbortSignal} = {},
) {
  const action = useMemo(
    () => (typeof run === 'function' ? new AsyncAction(run, {initial}) : run),
    [],
  );

  if (active && action.status === 'pending' && !signal?.aborted) {
    throw action.run({signal});
  }

  return action;
}
