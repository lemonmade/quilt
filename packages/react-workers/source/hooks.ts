import {useEffect, useRef} from 'react';

import type {
  ThreadOptions,
  CustomThreadWorker,
  CustomThreadWorkerConstructor,
} from '@quilted/workers';

export function useThreadWorker<Worker>(
  CustomWorker: CustomThreadWorkerConstructor<any, Worker>,
  options?: ThreadOptions<any, Worker>,
): CustomThreadWorker<unknown, Worker>['thread'] {
  const workerRef = useRef<CustomThreadWorker<unknown, Worker>>(null as any);

  if (workerRef.current == null) {
    workerRef.current = new CustomWorker(options);
  }

  useEffect(() => {
    workerRef.current.terminate();
  }, []);

  return workerRef.current.thread;
}
