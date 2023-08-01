import {on} from '@quilted/events';
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
      async *listen({signal}) {
        const messages = on<MessagePortEventMap, 'message'>(port, 'message', {
          signal,
        });

        port.start();

        for await (const message of messages) {
          yield message.data;
        }
      },
    },
    options,
  );
}
