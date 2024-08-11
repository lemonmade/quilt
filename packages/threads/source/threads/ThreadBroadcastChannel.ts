import {Thread, type ThreadOptions} from '../Thread.ts';

import {portToMessageTarget} from './ThreadMessagePort.ts';

/**
 * Creates a thread from a `BroadcastChannel` instance in the browser.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
 *
 * @example
 * import {ThreadBroadcastChannel} from '@quilted/threads';
 *
 * const channel = new BroadcastChannel('my-channel');;
 * const thread = new ThreadBroadcastChannel(channel);
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadBroadcastChannel<
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly channel: BroadcastChannel;

  constructor(
    channel: BroadcastChannel,
    options?: ThreadOptions<Target, Self>,
  ) {
    super(portToMessageTarget(channel), options);
    this.channel = channel;
  }
}
