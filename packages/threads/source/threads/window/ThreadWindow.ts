import {
  Thread,
  type ThreadOptions,
  type ThreadMessageTarget,
} from '../../Thread.ts';
import {CHECK_MESSAGE, RESPONSE_MESSAGE} from './shared.ts';
import {ThreadNestedWindow} from './ThreadNestedWindow.ts';

export interface ThreadWindowOptions<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends ThreadOptions<Imports, Exports> {
  targetOrigin?: string;
}

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
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly window: Window;

  /**
   * Creates a thread from a `Window` created by this environment.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
   *
   * @example
   * import {ThreadWindow} from '@quilted/threads';
   *
   * const popup = window.open('https://my-app.com/popup', 'MyAppPopup', 'popup');
   * const thread = ThreadWindow.from(popup);
   * await thread.imports.sendMessage('Hello world!');
   */
  static from<Imports = Record<string, never>, Exports = Record<string, never>>(
    window: Window,
    options?: ThreadWindowOptions<Imports, Exports>,
  ) {
    return new ThreadWindow(window, options);
  }

  /**
   * Starts a thread wrapped around a `window` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadWindow} from '@quilted/threads';
   *
   * const {getMessage} = ThreadWindow.import(window);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // In the nested window:
   *
   * import {ThreadNestedWindow} from '@quilted/threads';
   *
   * ThreadNestedWindow.export(window.opener, {
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
    return new ThreadWindow(window, options).imports;
  }

  /**
   * Starts a thread wrapped around a `window` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadWindow} from '@quilted/threads';
   *
   * ThreadWindow.export(window, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // In the nested window:
   *
   * import {ThreadNestedWindow} from '@quilted/threads';
   *
   * const {getMessage} = ThreadNestedWindow.import(window.opener);
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
    new ThreadWindow(window, {...options, exports});
  }

  /**
   * Creates a thread from within a window created by a parent document (for example,
   * an `iframe` or popup window).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
   *
   * @example
   * import {ThreadWindow} from '@quilted/threads';
   *
   * // Inside a document opened as a popup window
   * const thread = ThreadWindow.opener();
   * await thread.imports.sendMessage('Hello world!');
   */
  static opener = Object.assign(
    <Imports = Record<string, never>>(
      options?: Omit<
        ThreadWindowOptions<Imports, Record<string, never>>,
        'imports'
      >,
    ) => ThreadNestedWindow.from(window.opener, options),
    {
      /**
       * Starts a thread wrapped around a nested `window` object, and returns the imports
       * of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const {getMessage} = ThreadWindow.opener.import();
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
      import: <Imports = Record<string, never>>(
        options?: Omit<
          ThreadWindowOptions<Imports, Record<string, never>>,
          'imports'
        >,
      ) => ThreadNestedWindow.import(window.opener, options),

      /**
       * Starts a thread wrapped around a nested `window` object, providing the second
       * argument as the exports of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * ThreadWindow.opener.export({
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
      export: <Exports = Record<string, never>>(
        exports: Exports,
        options?: Omit<
          ThreadWindowOptions<Record<string, never>, Exports>,
          'exports'
        >,
      ) => ThreadNestedWindow.export(window.opener, {...options, exports}),
    },
  );

  constructor(
    window: Window,
    {
      targetOrigin = '*',
      ...options
    }: ThreadWindowOptions<Imports, Exports> = {},
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
