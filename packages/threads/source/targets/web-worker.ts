import {on} from '@quilted/events';
import type {ThreadTarget} from '../types';

export function targetFromWebWorker(worker: Worker): ThreadTarget {
  return {
    send(...args: [any, Transferable[]]) {
      worker.postMessage(...args);
    },
    async *listen({signal}) {
      const messages = on<WorkerEventMap, 'message'>(worker, 'message', {
        signal,
      });

      for await (const message of messages) {
        yield message.data;
      }
    },
  };
}
