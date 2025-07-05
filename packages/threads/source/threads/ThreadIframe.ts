import {Thread} from '../Thread.ts';
import {
  windowToThreadTarget,
  type ThreadWindowOptions,
} from './window/ThreadWindow.ts';
import {ThreadNestedIframe} from './ThreadNestedIframe.ts';

/**
 * Creates a thread from an iframe element.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
 *
 * @example
 * import {ThreadIframe} from '@quilted/threads';
 *
 * const iframe = document.querySelector('iframe#thread-iframe');
 * const thread = new ThreadIframe(iframe);
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadIframe<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly iframe: HTMLIFrameElement;

  /**
   * Creates a thread from an iframe element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
   *
   * @example
   * import {ThreadIframe} from '@quilted/threads';
   *
   * const iframe = document.querySelector('iframe#thread-iframe');
   * const thread = ThreadIframe.from(iframe);
   * await thread.imports.sendMessage('Hello world!');
   */
  static from<Imports = Record<string, never>, Exports = Record<string, never>>(
    iframe: HTMLIFrameElement,
    options?: ThreadWindowOptions<Imports, Exports>,
  ) {
    return new ThreadIframe(iframe, options);
  }

  /**
   * Starts a thread wrapped around an iframe element, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadIframe} from '@quilted/threads';
   *
   * const {getMessage} = ThreadIframe.import(iframe);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // In the nested window:
   *
   * import {ThreadIframe} from '@quilted/threads';
   *
   * ThreadIframe.parent.export({
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static import<Imports = Record<string, never>>(
    iframe: HTMLIFrameElement,
    options?: Omit<
      ThreadWindowOptions<Imports, Record<string, never>>,
      'imports'
    >,
  ) {
    return new ThreadIframe(iframe, options).imports;
  }

  /**
   * Starts a thread wrapped around an iframe element, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadIframe} from '@quilted/threads';
   *
   * ThreadIframe.export(iframe, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // In the nested iframe:
   *
   * import {ThreadIframe} from '@quilted/threads';
   *
   * const {getMessage} = ThreadIframe.parent.import();
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    iframe: HTMLIFrameElement,
    exports: Exports,
    options?: Omit<
      ThreadWindowOptions<Record<string, never>, Exports>,
      'exports'
    >,
  ) {
    new ThreadIframe(iframe, {...options, exports});
  }

  /**
   * Creates a thread from a `window.parent`, a reference to the parent window when rendering
   * in a nested iframe.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/parent
   *
   * @example
   * import {ThreadIframe} from '@quilted/threads';
   *
   * const thread = ThreadIframe.parent();
   * await thread.imports.sendMessage('Hello world!');
   */
  static parent = Object.assign(
    <Imports = Record<string, never>, Exports = Record<string, never>>(
      options?: ThreadWindowOptions<Imports, Exports>,
    ) => new ThreadNestedIframe(options),
    {
      /**
       * Starts a thread wrapped around a parent window, and returns the imports
       * of the thread.
       *
       * @example
       * ```ts
       * import {ThreadIframe} from '@quilted/threads';
       *
       * const {getMessage} = ThreadIframe.parent.import();
       * const message = await getMessage(); // 'Hello, world!'
       *
       * // In the parent window:
       *
       * import {ThreadIframe} from '@quilted/threads';
       *
       * ThreadIframe.export(iframe, {
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
      ) => ThreadNestedIframe.import(options),

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
       * const message = await getMessage(); // 'Hello, world!'
       * ```
       */
      export: <Exports = Record<string, never>>(
        exports: Exports,
        options?: Omit<
          ThreadWindowOptions<Record<string, never>, Exports>,
          'exports'
        >,
      ) => ThreadNestedIframe.export(exports, options),
    },
  );

  constructor(
    iframe: HTMLIFrameElement,
    {
      targetOrigin = '*',
      ...options
    }: ThreadWindowOptions<Imports, Exports> = {},
  ) {
    super(windowToThreadTarget(iframe.contentWindow!, {targetOrigin}), options);
    this.iframe = iframe;
  }
}
