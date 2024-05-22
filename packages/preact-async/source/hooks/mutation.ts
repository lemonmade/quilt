import {useMemo, useRef} from 'preact/hooks';

import {AsyncAction} from '@quilted/async';
import type {AsyncActionFunction} from '@quilted/async';

export function useAsyncMutation<Data = unknown, Input = unknown>(
  asyncFunction: AsyncActionFunction<Data, Input>,
) {
  const internalsRef = useRef<{
    function: AsyncActionFunction<Data, Input>;
  }>();
  internalsRef.current ??= {} as any;
  Object.assign(internalsRef.current!, {function: asyncFunction});

  return useMemo(
    () =>
      new AsyncAction<Data, Input>((...args) =>
        internalsRef.current!.function(...args),
      ),
    [],
  );
}
