import {Thread, type ThreadOptions} from '../Thread.ts';
import {ThreadSerializationJSON} from '../serialization/ThreadSerializationJSON.ts';

/**
 * Creates a thread from a `WebSocket` instance in the browser.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 *
 * @example
 * import {ThreadBrowserWebSocket} from '@quilted/threads';
 *
 * const websocket = new WebSocket('ws://localhost:8080');
 * const thread = new ThreadBrowserWebSocket(websocket);
 * await thread.imports.sendMessage('Hello world!');
 */
export class ThreadBrowserWebSocket<
  Imports = Record<string, never>,
  Exports = Record<string, never>,
> extends Thread<Imports, Exports> {
  readonly socket: WebSocket;

  /**
   * Starts a thread wrapped around a `WebSocket` object, and returns the imports
   * of the thread.
   *
   * @example
   * ```ts
   * import {ThreadBrowserWebSocket} from '@quilted/threads';
   *
   * const websocket = new WebSocket('ws://localhost:8080');
   * const {getMessage} = ThreadBrowserWebSocket.import(websocket);
   * const message = await getMessage(); // 'Hello, world!'
   * ```
   */
  static import<Imports = Record<string, never>>(
    socket: WebSocket,
    options?: Omit<ThreadOptions<Imports, Record<string, never>>, 'imports'>,
  ) {
    return new ThreadBrowserWebSocket<Imports>(socket, options).imports;
  }

  /**
   * Starts a thread wrapped around a `WebSocket` object, providing the second
   * argument as the exports of the thread.
   *
   * @example
   * ```ts
   * import {ThreadBrowserWebSocket} from '@quilted/threads';
   *
   * const websocket = new WebSocket('ws://localhost:8080');
   *
   * ThreadBrowserWebSocket.export(websocket, {
   *   async getMessage() {
   *     return 'Hello, world!';
   *   },
   * });
   * ```
   */
  static export<Exports = Record<string, never>>(
    socket: WebSocket,
    exports: Exports,
    options?: Omit<ThreadOptions<Record<string, never>, Exports>, 'exports'>,
  ) {
    new ThreadBrowserWebSocket(socket, {...options, exports});
  }

  constructor(
    socket: WebSocket,
    {
      serialization = new ThreadSerializationJSON(),
      ...options
    }: ThreadOptions<Imports, Exports> = {},
  ) {
    super(
      {
        async send(message) {
          // TODO: only wait for this once.
          if (socket.readyState !== socket.OPEN) {
            await new Promise<void>((resolve) => {
              socket.addEventListener(
                'open',
                () => {
                  resolve();
                },
                {once: true},
              );
            });
          }

          socket.send(JSON.stringify(message));
        },
        listen(listener, {signal}) {
          socket.addEventListener(
            'message',
            (event) => {
              listener(JSON.parse(event.data));
            },
            {signal},
          );
        },
      },
      {...options, serialization},
    );
    this.socket = socket;
  }
}
