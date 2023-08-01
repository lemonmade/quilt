import {on, once} from '@quilted/events';
import {createThread, type ThreadOptions} from './target.ts';

export function createThreadFromBrowserWebSocket<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(websocket: WebSocket, options?: ThreadOptions<Self, Target>) {
  return createThread(
    {
      async send(message) {
        if (websocket.readyState !== websocket.OPEN) {
          await once(websocket, 'open');
        }

        websocket.send(JSON.stringify(message));
      },
      async *listen({signal}) {
        const messages = on<WebSocketEventMap, 'message'>(
          websocket,
          'message',
          {
            signal,
          },
        );

        if (websocket.readyState !== websocket.OPEN) {
          await once(websocket, 'open', {signal});
        }

        if (signal?.aborted) return;

        for await (const message of messages) {
          yield JSON.parse(message.data);
        }
      },
    },
    options,
  );
}
