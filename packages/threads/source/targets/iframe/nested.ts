import {NestedAbortController} from '@quilted/events';
import {createThread, type ThreadOptions} from '../target.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';

export function createThreadFromInsideIframe<
  Self = Record<string, never>,
  Target = Record<string, never>,
>({
  targetOrigin = '*',
  ...options
}: ThreadOptions<Self, Target> & {targetOrigin?: string} = {}) {
  if (typeof self === 'undefined' || self.parent == null) {
    throw new Error(
      'You are not inside an iframe, because there is no parent window.',
    );
  }

  const {parent} = self;

  const abort = options.signal
    ? new NestedAbortController(options.signal)
    : new AbortController();

  const ready = () => {
    const respond = () => parent.postMessage(RESPONSE_MESSAGE, targetOrigin);

    // Handles wrappers that want to connect after the page has already loaded
    self.addEventListener(
      'message',
      ({data}) => {
        if (data === CHECK_MESSAGE) respond();
      },
      {signal: options.signal},
    );

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

  return createThread(
    {
      send(message, transfer) {
        return parent.postMessage(message, targetOrigin, transfer);
      },
      listen(listen, {signal}) {
        self.addEventListener(
          'message',
          (event) => {
            if (event.data === CHECK_MESSAGE) return;
            listen(event.data);
          },
          {signal},
        );
      },
    },
    options,
  );
}
