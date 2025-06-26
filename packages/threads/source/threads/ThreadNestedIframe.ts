import {Thread} from '../Thread.ts';
import {nestedWindowToThreadTarget} from './window/ThreadNestedWindow.ts';
import type {ThreadWindowOptions} from './window/ThreadWindow.ts';

export interface ThreadNestedIframeOptions<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends ThreadWindowOptions<Imports, Exports> {
  parent?: Window;
}

/**
 * Creates a thread from within an iframe nested in a top-level document.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
 *
 * @example
 * import {ThreadNestedIframe} from '@quilted/threads';
 *
 * const thread = new ThreadNestedIframe();
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadNestedIframe<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly parent: Window;

  /**
   * Starts a thread wrapped around a parent window, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadNestedIframe} from '@quilted/threads';
   *
   * const {getMessage} = ThreadNestedIframe.import();
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
  static import<Imports = Record<string, never>>(
    options?: Omit<
      ThreadWindowOptions<Imports, Record<string, never>>,
      'imports'
    >,
  ) {
    return new ThreadNestedIframe<Imports>(options).imports;
  }

  /**
   * Starts a thread wrapped around a parent window, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadNestedIframe} from '@quilted/threads';
   *
   * ThreadNestedIframe.export({
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
  static export<Exports = Record<string, never>>(
    exports: Exports,
    options?: Omit<
      ThreadWindowOptions<Record<string, never>, Exports>,
      'exports'
    >,
  ) {
    new ThreadNestedIframe({...options, exports});
  }

  constructor({
    parent = globalThis.parent,
    targetOrigin = '*',
    ...options
  }: ThreadNestedIframeOptions<Imports, Exports> = {}) {
    if (typeof self === 'undefined' || parent == null) {
      throw new Error(
        'You are not inside an iframe, because there is no parent window.',
      );
    }

    super(nestedWindowToThreadTarget(parent, {targetOrigin}), options);

    this.parent = parent;
  }
}
