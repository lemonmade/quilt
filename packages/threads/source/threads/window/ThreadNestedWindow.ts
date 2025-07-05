import {Thread, type ThreadMessageTarget} from '../../Thread.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';
import type {ThreadWindowOptions} from './ThreadWindow.ts';

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
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly parent: Window;

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
   * const thread = ThreadNestedWindow.from(window.opener);
   * await thread.imports.sendMessage('Hello world!');
   */
  static from<Imports = Record<string, never>, Exports = Record<string, never>>(
    window: Window,
    options?: ThreadWindowOptions<Imports, Exports>,
  ) {
    return new ThreadNestedWindow(window, options);
  }

  /**
   * Starts a thread wrapped around a nested `window` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadNestedWindow} from '@quilted/threads';
   *
   * const {getMessage} = ThreadNestedWindow.import(window.opener);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // In the parent window:
   *
   * import {ThreadWindow} from '@quilted/threads';
   *
   * ThreadWindow.export(window, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static import<Imports = Record<string, never>>(
    window: Window,
    options?: Omit<
      ThreadWindowOptions<Imports, Record<string, never>>,
      'imports'
    >,
  ) {
    return new ThreadNestedWindow<Imports>(window, options).imports;
  }

  /**
   * Starts a thread wrapped around a nested `window` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadNestedWindow} from '@quilted/threads';
   *
   * ThreadNestedWindow.export(window.opener, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // In the parent window:
   *
   * import {ThreadWindow} from '@quilted/threads';
   *
   * const {getMessage} = ThreadWindow.import(window);
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    window: Window,
    exports: Exports,
    options?: Omit<
      ThreadWindowOptions<Record<string, never>, Exports>,
      'exports'
    >,
  ) {
    new ThreadNestedWindow(window, {...options, exports});
  }

  constructor(
    parent: Window,
    {
      targetOrigin = '*',
      ...options
    }: ThreadWindowOptions<Imports, Exports> = {},
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
