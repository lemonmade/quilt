import {Thread, type ThreadOptions} from '../Thread.ts';
import {nestedWindowToThreadTarget} from './window/ThreadNestedWindow.ts';

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
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly parent: Window;

  constructor({
    parent = globalThis.parent,
    targetOrigin = '*',
    ...options
  }: ThreadOptions<Target, Self> & {
    parent?: Window;
    targetOrigin?: string;
  } = {}) {
    if (typeof self === 'undefined' || parent == null) {
      throw new Error(
        'You are not inside an iframe, because there is no parent window.',
      );
    }

    super(nestedWindowToThreadTarget(parent, {targetOrigin}), options);

    this.parent = parent;
  }
}
