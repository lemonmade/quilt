import {useEffect, useRef} from 'react';

import type {ThreadWorkerCreator} from '@quilted/workers';

export function useThreadWorker<Worker>(
  creator: ThreadWorkerCreator<unknown, Worker>,
  options?: Parameters<typeof creator>[0],
): ReturnType<ThreadWorkerCreator<unknown, Worker>> {
  const workerRef = useRef<{
    readonly worker: ReturnType<typeof creator>;
    readonly controller: AbortController;
  }>(null as any);

  if (workerRef.current === null) {
    const controller = new AbortController();

    workerRef.current = {
      controller,
      worker: creator({signal: controller.signal, ...options}),
    };
  }

  const {worker, controller} = workerRef.current;

  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, [controller]);

  return worker;
}
