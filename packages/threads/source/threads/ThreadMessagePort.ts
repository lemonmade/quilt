import {
  Thread,
  type ThreadOptions,
  type ThreadMessageTarget,
} from '../Thread.ts';

/**
 * Creates a thread from a `MessagePort` instance in the browser.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
 *
 * @example
 * import {ThreadMessagePort} from '@quilted/threads';
 *
 * const channel = new MessageChannel();
 *
 * const threadOne = new ThreadMessagePort(channel.port1);
 * const threadTwo = new ThreadMessagePort(channel.port2, {
 *   exports: {
 *     async sendMessage(message) {
 *       console.log(message);
 *     },
 *   },
 * });
 *
 * channel.port1.start();
 * channel.port2.start();
 *
 * await threadOne.imports.sendMessage('Hello world!');
 */
export class ThreadMessagePort<
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly port: MessagePort;

  constructor(port: MessagePort, options?: ThreadOptions<Target, Self>) {
    super(portToMessageTarget(port), options);
    this.port = port;
  }
}

export function portToMessageTarget(
  port: Pick<MessagePort, 'postMessage' | 'addEventListener'>,
): ThreadMessageTarget {
  return {
    send(...args: [any, Transferable[]]) {
      port.postMessage(...args);
    },
    listen(listener, {signal}) {
      port.addEventListener(
        'message',
        (event) => {
          listener(event.data);
        },
        {signal},
      );
    },
  };
}
