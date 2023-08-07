import {createThread, type ThreadOptions} from './target.ts';

export function createThreadFromMessagePort<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(port: MessagePort, options?: ThreadOptions<Self, Target>) {
  return createThread(
    {
      send(...args: [any, Transferable[]]) {
        port.postMessage(...args);
      },
      listen(listener, {signal}) {
        port.addEventListener(
          'message',
          (event) => {
            listener(event.data);
          },
          {signal},
        );

        port.start();
      },
    },
    options,
  );
}
