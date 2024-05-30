import type {AsyncAction} from '@quilted/async';
import {useSignalEffect} from '@quilted/preact-signals';
import {useRef} from 'preact/hooks';

export function useAsyncCacheControl(
  action: AsyncAction<any, any>,
  {maxAge, signal}: {maxAge: number; signal?: AbortSignal},
) {
  const internalsRef = useRef<{
    maxAge: number;
    signal?: AbortSignal;
    timeoutHandle?: ReturnType<typeof setTimeout>;
  }>();
  internalsRef.current ??= {maxAge};
  Object.assign(internalsRef.current!, {maxAge, signal});

  useSignalEffect(() => {
    const finished = action.finished;

    if (finished == null) return;

    const {maxAge, timeoutHandle} = internalsRef.current!;

    if (timeoutHandle != null) clearTimeout(timeoutHandle);

    if (finished.status === 'resolved') {
      const timeout = Number.isFinite(maxAge)
        ? Math.max(0, finished.finishedAt! + maxAge - Date.now())
        : undefined;

      if (timeout != null) {
        internalsRef.current!.timeoutHandle = setTimeout(() => {
          if (internalsRef.current!.signal?.aborted) return;

          action.rerun({signal, force: true});
        }, timeout);
      }
    }
  }, [action]);
}
