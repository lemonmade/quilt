import {on} from '@quilted/events';
import type {ThreadTarget} from '../types';

export function targetFromMessagePort(port: MessagePort): ThreadTarget {
  return {
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
  };
}
