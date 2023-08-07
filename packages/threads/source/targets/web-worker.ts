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
      listen(listener, {signal}) {
        worker.addEventListener(
          'message',
          (event) => {
            listener(event.data);
          },
          {signal},
        );
      },
    },
    options,
  );
}
