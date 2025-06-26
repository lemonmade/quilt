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
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly channel: BroadcastChannel;

  /**
   * Starts a thread wrapped around a `BroadcastChannel` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadBroadcastChannel} from '@quilted/threads';
   *
   * const channel = new BroadcastChannel('my-channel');
   * const {getMessage} = ThreadBroadcastChannel.import(channel);
   * const message = await getMessage(); // 'Hello, world!'
   *
   * // In another context (tab, window, etc.):
   *
   * import {ThreadBroadcastChannel} from '@quilted/threads';
   *
   * const channel = new BroadcastChannel('my-channel');
   * ThreadBroadcastChannel.export(channel, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static import<Imports = Record<string, never>>(
    channel: BroadcastChannel,
    options?: Omit<ThreadOptions<Imports, Record<string, never>>, 'imports'>,
  ) {
    return new ThreadBroadcastChannel<Imports>(channel, options).imports;
  }

  /**
   * Starts a thread wrapped around a `BroadcastChannel` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadBroadcastChannel} from '@quilted/threads';
   *
   * const channel = new BroadcastChannel('my-channel');
   *
   * ThreadBroadcastChannel.export(channel, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * // In another context (tab, window, etc.):
   *
   * import {ThreadBroadcastChannel} from '@quilted/threads';
   *
   * const channel = new BroadcastChannel('my-channel');
   * const {getMessage} = ThreadBroadcastChannel.import(channel);
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    channel: BroadcastChannel,
    exports: Exports,
    options?: Omit<ThreadOptions<Record<string, never>, Exports>, 'exports'>,
  ) {
    new ThreadBroadcastChannel(channel, {...options, exports});
  }

  constructor(
    channel: BroadcastChannel,
    options?: ThreadOptions<Imports, Exports>,
  ) {
    super(portToMessageTarget(channel), options);
    this.channel = channel;
  }
}
