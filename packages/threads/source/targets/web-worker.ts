import {on} from '@quilted/events';
import {createThread, type ThreadOptions} from './target.ts';

export function createThreadFromWebWorker<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(worker: Worker, options?: ThreadOptions<Self, Target>) {
  return createThread(
    {
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
    },
    options,
  );
}
