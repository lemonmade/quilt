import {
  Thread,
  type ThreadOptions,
  type ThreadMessageTarget,
} from '../Thread.ts';

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
    return new ThreadWindow<Imports, Exports>(window, options);
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
      'exports'
    >,
  ) {
    return new ThreadWindow<Imports>(window, options).imports;
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
      ThreadWindowOptions<Record<string, never>, NoInfer<Exports>>,
      'exports' | 'imports'
    >,
  ) {
    new ThreadWindow(window, {...options, exports});
  }

  /**
   * Creates a thread from an `<iframe>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
   *
   * @example
   * import {ThreadWindow} from '@quilted/threads';
   *
   * const iframe = document.querySelector('iframe#my-iframe');
   * const thread = ThreadWindow.iframe(iframe, {
   *   targetOrigin: 'https://my-app.com',
   *   exports: {
   *     async connect() {
   *       return {message: 'Hello, world!'};
   *     },
   *   },
   * });
   */
  static iframe = Object.assign(
    <Imports = Record<string, never>, Exports = Record<string, never>>(
      iframe: HTMLIFrameElement,
      options?: ThreadWindowOptions<Imports, Exports>,
    ) =>
      ThreadWindow.from<Imports, Exports>(
        iframeContentWindowOrFail(iframe),
        options,
      ),
    {
      /**
       * Starts a thread wrapped around the content window of an `<iframe>` element,
       * and returns the imports of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const {getMessage} = ThreadWindow.iframe.import(iframe);
       *
       * // Make sure to wait until the iframe is ready — typically, you’ll
       * // instead want the iframe to send a message to the parent window,
       * // which then starts talking back.
       *
       * const message = await getMessage(); // 'Hello, world!'
       *
       * // In the iframe:
       *
       * import {ThreadWindow} from '@quilted/threads';
       *
       * ThreadWindow.parent.export(iframe, {
       *   async getMessage() {
       *     return 'Hello, world!';
       *   },
       * });
       * ```
       */
      import: <Imports = Record<string, never>>(
        iframe: HTMLIFrameElement,
        options?: Omit<
          ThreadWindowOptions<Imports, Record<string, never>>,
          'exports'
        >,
      ) =>
        ThreadWindow.import<Imports>(
          iframeContentWindowOrFail(iframe),
          options,
        ),

      /**
       * Starts a thread wrapped around the content window of an `<iframe>` element,
       * providing the second argument as the exports of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * ThreadWindow.iframe.export(iframe, {
       *   async connect() {
       *     return {message: 'Hello, world!'};
       *   },
       * });
       *
       * // In the iframe:
       *
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const {connect} = ThreadWindow.parent.import();
       * const {message} = await connect(); // 'Hello, world!'
       * ```
       */
      export: <Exports = Record<string, never>>(
        iframe: HTMLIFrameElement,
        exports: Exports,
        options?: Omit<
          ThreadWindowOptions<Record<string, never>, Exports>,
          'exports' | 'imports'
        >,
      ) =>
        ThreadWindow.export<Exports>(
          iframeContentWindowOrFail(iframe),
          exports,
          options,
        ),
    },
  );

  /**
   * Creates a thread from a `window.parent`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/parent
   *
   * @example
   * import {ThreadWindow} from '@quilted/threads';
   *
   * const thread = ThreadWindow.parent();
   * await thread.imports.connect({mesage: 'Hello, from the child window!'});
   */
  static parent = Object.assign(
    <Imports = Record<string, never>, Exports = Record<string, never>>(
      options?: ThreadWindowOptions<Imports, Exports>,
    ) => ThreadWindow.from<Imports, Exports>(distinctParentOrFail(), options),
    {
      /**
       * Starts a thread wrapped around a parent window, and returns the imports
       * of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const {connect} = ThreadWindow.parent.import();
       * const {message} = await connect(); // 'Hello, world!'
       *
       * // In the parent window:
       *
       * import {ThreadIframe} from '@quilted/threads';
       *
       * ThreadIframe.export(iframe, {
       *   async connect() {
       *     return {mesage: 'Hello, world!'};
       *   },
       * });
       * ```
       */
      import: <Imports = Record<string, never>>(
        options?: Omit<
          ThreadWindowOptions<Imports, Record<string, never>>,
          'exports'
        >,
      ) => ThreadWindow.import<Imports>(distinctParentOrFail(), options),

      /**
       * Starts a thread wrapped around a parent window, providing the second
       * argument as the exports of the thread.
       *
       * @example
       * ```ts
       * import {ThreadIframe} from '@quilted/threads';
       *
       * ThreadIframe.parent.export({
       *   async getMessage() {
       *     return 'Hello, world!';
       *   },
       * });
       *
       * // In the parent window:
       *
       * import {ThreadIframe} from '@quilted/threads';
       *
       * const {getMessage} = ThreadIframe.import(iframe);
       *
       * // Make sure to wait until the iframe is ready — typically, you’ll
       * // instead want the iframe to send a message to the parent window,
       * // which then starts talking back.
       *
       * const message = await getMessage(); // 'Hello, world!'
       * ```
       */
      export: <Exports = Record<string, never>>(
        exports: Exports,
        options?: Omit<
          ThreadWindowOptions<Record<string, never>, Exports>,
          'exports' | 'imports'
        >,
      ) =>
        ThreadWindow.export<Exports>(distinctParentOrFail(), exports, options),
    },
  );

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
   * await thread.imports.connect({message: 'Hello, from the opened window!'});
   */
  static opener = Object.assign(
    <Imports = Record<string, never>, Exports = Record<string, never>>(
      options?: ThreadWindowOptions<Imports, Exports>,
    ) => ThreadWindow.from<Imports, Exports>(windowOpenerOrFail(), options),
    {
      /**
       * Starts a thread wrapped around a nested `window` object, and returns the imports
       * of the thread.
       *
       * @example
       * ```ts
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const {connect} = ThreadWindow.opener.import();
       * const {message} = await connect(); // 'Hello, world!'
       *
       * // In the parent window:
       *
       * import {ThreadWindow} from '@quilted/threads';
       *
       * const window = window.open();
       * ThreadWindow.export(window, {
       *   async connect() {
       *     return {message: 'Hello, world!'};
       *   },
       * });
       * ```
       */
      import: <Imports = Record<string, never>>(
        options?: Omit<
          ThreadWindowOptions<Imports, Record<string, never>>,
          'exports'
        >,
      ) => ThreadWindow.import<Imports>(windowOpenerOrFail(), options),

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
       * const window = window.open();
       * const {getMessage} = ThreadWindow.import(window);
       *
       * // Make sure to wait until the window is ready — typically, you’ll
       * // instead want the window to send a message to the parent window,
       * // which then starts talking back.
       *
       * const message = await getMessage(); // 'Hello, world!'
       * ```
       */
      export: <Exports = Record<string, never>>(
        exports: Exports,
        options?: Omit<
          ThreadWindowOptions<Record<string, never>, NoInfer<Exports>>,
          'exports' | 'imports'
        >,
      ) => ThreadWindow.export<Exports>(windowOpenerOrFail(), exports, options),
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

function windowOpenerOrFail() {
  if (typeof window === 'undefined' || window.opener == null) {
    throw new Error('No opener window found');
  }

  return window.opener;
}

function distinctParentOrFail() {
  if (
    typeof window === 'undefined' ||
    window.parent == null ||
    window.parent === window
  ) {
    throw new Error('No parent window found');
  }

  return window.parent;
}

function iframeContentWindowOrFail(iframe: HTMLIFrameElement) {
  if (iframe.contentWindow == null) {
    throw new Error('No content window found');
  }

  return iframe.contentWindow;
}

export function windowToThreadTarget(
  window: Window,
  {targetOrigin = '*'}: {targetOrigin?: string} = {},
): ThreadMessageTarget {
  const sendMessage: ThreadMessageTarget['send'] = function send(
    message,
    transfer,
  ) {
    window.postMessage(message, targetOrigin, transfer);
  };

  return {
    send(message, transfer) {
      return sendMessage(message, transfer);
    },
    listen(listen, {signal}) {
      self.addEventListener(
        'message',
        (event) => {
          if (event.source !== window) return;
          listen(event.data);
        },
        {signal},
      );
    },
  };
}
