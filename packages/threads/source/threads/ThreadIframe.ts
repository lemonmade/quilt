import {Thread, type ThreadOptions} from '../Thread.ts';
import {windowToThreadTarget} from './window/ThreadWindow.ts';

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
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly iframe: HTMLIFrameElement;

  constructor(
    iframe: HTMLIFrameElement,
    {
      targetOrigin = '*',
      ...options
    }: ThreadOptions<Target, Self> & {
      targetOrigin?: string;
    } = {},
  ) {
    super(windowToThreadTarget(iframe.contentWindow!, {targetOrigin}), options);
    this.iframe = iframe;
  }
}
