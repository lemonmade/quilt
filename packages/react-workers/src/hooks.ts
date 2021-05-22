import {useEffect, useRef} from 'react';

import {terminate} from '@quilted/workers';
import type {CallableWorkerCreator} from '@quilted/workers';

export function useWorker<Worker>(
  creator: CallableWorkerCreator<Worker>,
  ...args: Parameters<typeof creator>
) {
  const workerRef = useRef<ReturnType<typeof creator>>(null as any);

  if (workerRef.current === null) {
    workerRef.current = creator(...args);
  }

  const {current: worker} = workerRef;

  useEffect(() => {
    return () => {
      terminate(worker);
    };
  }, [worker]);

  return worker;
}
