import {
  Thread,
  type ThreadOptions,
  type ThreadMessageTarget,
} from '../../Thread.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';

/**
 * Creates a thread from within a window created by a parent document (for example,
 * an `iframe` or popup window).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
 *
 * @example
 * import {ThreadNestedWindow} from '@quilted/threads';
 *
 * // Inside a document opened as a popup window
 * const thread = new ThreadNestedWindow(window.opener);
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadNestedWindow<
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly parent: Window;

  constructor(
    parent: Window,
    {
      targetOrigin = '*',
      ...options
    }: ThreadOptions<Target, Self> & {
      targetOrigin?: string;
    } = {},
  ) {
    super(nestedWindowToThreadTarget(parent, {targetOrigin}), options);
    this.parent = parent;
  }
}

export function nestedWindowToThreadTarget(
  parent: Window,
  {targetOrigin = '*'}: {targetOrigin?: string} = {},
): ThreadMessageTarget {
  const ready = () => {
    const respond = () => parent.postMessage(RESPONSE_MESSAGE, targetOrigin);

    self.addEventListener('message', ({data, source}) => {
      if (source !== parent) return;
      if (data === CHECK_MESSAGE) respond();
    });

    respond();
  };

  if (document.readyState === 'complete') {
    ready();
  } else {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        ready();
      }
    });
  }

  return {
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
  };
}
