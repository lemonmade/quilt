import {on} from '@quilted/events';
import type {ThreadTarget} from '../../types';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared';

export function targetFromInsideIframe({
  targetOrigin = '*',
}: {targetOrigin?: string} = {}): ThreadTarget {
  if (typeof self === 'undefined' || self.parent == null) {
    throw new Error(
      'You are not inside an iframe, because there is no parent window.',
    );
  }

  const {parent} = self;

  const abort = new AbortController();

  const ready = () => {
    const respond = () => parent.postMessage(RESPONSE_MESSAGE, targetOrigin);

    // Handles wrappers that want to connect after the page has already loaded
    self.addEventListener('message', ({data}) => {
      if (data === CHECK_MESSAGE) respond();
    });

    respond();
  };

  // Listening to `readyState` in iframe, though the child iframe could probably
  // send a `postMessage` that it is ready to receive messages sooner than that.
  if (document.readyState === 'complete') {
    ready();
  } else {
    document.addEventListener(
      'readystatechange',
      () => {
        if (document.readyState === 'complete') {
          ready();
          abort.abort();
        }
      },
      {signal: abort.signal},
    );
  }

  return {
    send(message, transfer) {
      return parent.postMessage(message, targetOrigin, transfer);
    },
    async *listen({signal}) {
      const messages = on<WindowEventHandlersEventMap, 'message'>(
        self,
        'message',
        {
          signal,
        },
      );

      for await (const message of messages) {
        if (message.data === CHECK_MESSAGE) continue;
        yield message.data;
      }
    },
  };
}
