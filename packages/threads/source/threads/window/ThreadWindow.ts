import {
  Thread,
  type ThreadOptions,
  type ThreadMessageTarget,
} from '../../Thread.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';

/**
 * Creates a thread from a `Window` created by this environment.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
 *
 * @example
 * import {ThreadWindow} from '@quilted/threads';
 *
 * const popup = window.open('https://my-app.com/popup', 'MyAppPopup', 'popup');
 * const thread = new ThreadWindow(popup);
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadWindow<
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly window: Window;

  constructor(
    window: Window,
    {
      targetOrigin = '*',
      ...options
    }: ThreadOptions<Target, Self> & {
      targetOrigin?: string;
    } = {},
  ) {
    super(windowToThreadTarget(window, {targetOrigin}), options);
    this.window = window;
  }
}

export function windowToThreadTarget(
  window: Window,
  {targetOrigin = '*'}: {targetOrigin?: string} = {},
): ThreadMessageTarget {
  let connected = false;

  const sendMessage: ThreadMessageTarget['send'] = function send(
    message,
    transfer,
  ) {
    window.postMessage(message, targetOrigin, transfer);
  };

  const connectedPromise = new Promise<void>((resolve) => {
    const abort = new AbortController();

    globalThis.window.addEventListener(
      'message',
      (event) => {
        if (event.source !== window) return;

        if (event.data === RESPONSE_MESSAGE) {
          connected = true;
          abort.abort();
          resolve();
        }
      },
      {signal: abort.signal},
    );

    abort.signal.addEventListener('abort', () => resolve(), {once: true});

    sendMessage(CHECK_MESSAGE);
  });

  return {
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
          if (event.source !== window) return;
          if (event.data === RESPONSE_MESSAGE) return;
          listen(event.data);
        },
        {signal},
      );
    },
  };
}
