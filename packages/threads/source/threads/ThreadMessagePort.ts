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
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly port: MessagePort;

  /**
   * Starts a thread wrapped around a `MessagePort` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadMessagePort} from '@quilted/threads';
   *
   * const channel = new MessageChannel();
   *
   * ThreadMessagePort.export(channel.port1, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * const {getMessage} = ThreadMessagePort.import(channel.port2);
   *
   * channel.port1.start();
   * channel.port2.start();
   *
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static import<Imports = Record<string, never>>(
    port: MessagePort,
    options?: Omit<ThreadOptions<Imports, Record<string, never>>, 'imports'>,
  ) {
    return new ThreadMessagePort<Imports>(port, options).imports;
  }

  /**
   * Starts a thread wrapped around a `MessagePort` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadMessagePort} from '@quilted/threads';
   *
   * const channel = new MessageChannel();
   *
   * ThreadMessagePort.export(channel.port1, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   *
   * const {getMessage} = ThreadMessagePort.import(channel.port2);
   *
   * channel.port1.start();
   * channel.port2.start();
   *
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static export<Exports = Record<string, never>>(
    port: MessagePort,
    exports: Exports,
    options?: Omit<ThreadOptions<Record<string, never>, Exports>, 'exports'>,
  ) {
    new ThreadMessagePort(port, {...options, exports});
  }

  constructor(port: MessagePort, options?: ThreadOptions<Imports, Exports>) {
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
