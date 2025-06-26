import {Thread} from '../Thread.ts';
import {
  windowToThreadTarget,
  type ThreadWindowOptions,
} from './window/ThreadWindow.ts';

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
   * import {ThreadNestedIframe} from '@quilted/threads';
   *
   * ThreadNestedIframe.export({
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
   * import {ThreadNestedIframe} from '@quilted/threads';
   *
   * const {getMessage} = ThreadNestedIframe.import();
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
