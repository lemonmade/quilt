import {on} from '@quilted/events';
import type {ThreadTarget} from '../../types';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared';

export function targetFromIframe(
  iframe: HTMLIFrameElement,
  {targetOrigin = '*'}: {targetOrigin?: string} = {},
): ThreadTarget {
  let connected = false;

  const sendMessage: ThreadTarget['send'] = function send(message, transfer) {
    iframe.contentWindow?.postMessage(message, targetOrigin, transfer);
  };

  const connectedPromise = new Promise<void>((resolve) => {
    const abort = new AbortController();

    window.addEventListener(
      'message',
      (event) => {
        if (event.source !== iframe.contentWindow) return;

        if (event.data === RESPONSE_MESSAGE) {
          connected = true;
          abort.abort();
          resolve();
        }
      },
      {signal: abort.signal},
    );

    sendMessage(CHECK_MESSAGE);
  });

  return {
    send(message, transfer) {
      if (!connected) {
        return connectedPromise.then(() => sendMessage(message, transfer));
      }

      return sendMessage(message, transfer);
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
        if (message.source !== iframe.contentWindow) continue;
        if (message.data === RESPONSE_MESSAGE) continue;
        yield message.data;
      }
    },
  };
}
