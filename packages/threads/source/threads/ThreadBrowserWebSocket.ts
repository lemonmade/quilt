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
  Target = Record<string, never>,
  Self = Record<string, never>,
> extends Thread<Target, Self> {
  readonly socket: WebSocket;

  constructor(
    socket: WebSocket,
    {
      serialization = new ThreadSerializationJSON(),
      ...options
    }: ThreadOptions<Target, Self> = {},
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
