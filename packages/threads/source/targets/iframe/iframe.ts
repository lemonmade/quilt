import {NestedAbortController} from '@quilted/events';
import {
  createThread,
  type ThreadTarget,
  type ThreadOptions,
} from '../target.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';

export function createThreadFromIframe<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(
  iframe: HTMLIFrameElement,
  {
    targetOrigin = '*',
    ...options
  }: ThreadOptions<Self, Target> & {targetOrigin?: string} = {},
) {
  let connected = false;

  const sendMessage: ThreadTarget['send'] = function send(message, transfer) {
    iframe.contentWindow?.postMessage(message, targetOrigin, transfer);
  };

  const connectedPromise = new Promise<void>((resolve) => {
    const abort = options.signal
      ? new NestedAbortController(options.signal)
      : new AbortController();

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

    abort.signal.addEventListener(
      'abort',
      () => {
        resolve();
      },
      {once: true},
    );

    sendMessage(CHECK_MESSAGE);
  });

  return createThread(
    {
      send(message, transfer) {
        if (!connected) {
          return connectedPromise.then(() => {
            if (connected) return sendMessage(message, transfer);
          });
        }

        return sendMessage(message, transfer);
      },
      listen(listen, {signal}) {
        self.addEventListener(
          'message',
          (event) => {
            if (event.source !== iframe.contentWindow) return;
            if (event.data === RESPONSE_MESSAGE) return;
            listen(event.data);
          },
          {signal},
        );
      },
    },
    options,
  );
}
