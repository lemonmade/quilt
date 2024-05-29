import type {AsyncAction} from '@quilted/async';
import {useSignalEffect} from '@quilted/preact-signals';
import {useRef} from 'preact/hooks';

export function useAsyncRetry(
  action: AsyncAction<any, any>,
  {limit = 3, signal}: {limit?: number; signal?: AbortSignal} = {},
) {
  const internalsRef = useRef<{
    signal?: AbortSignal;
    limit: number;
    retryCount: number;
  }>();
  internalsRef.current ??= {limit, retryCount: 0};
  Object.assign(internalsRef.current!, {limit, signal});

  useSignalEffect(() => {
    const finished = action.finished;

    if (finished == null) return;

    if (finished.status === 'rejected') {
      const retryCount = (internalsRef.current!.retryCount += 1);

      if (retryCount <= internalsRef.current!.limit) {
        action.rerun({signal});
      }
    } else {
      internalsRef.current!.retryCount = 0;
    }
  }, [action]);
}
