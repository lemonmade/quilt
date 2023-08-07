import {createThread, type ThreadOptions} from './target.ts';

export function createThreadFromBrowserWebSocket<
  Self = Record<string, never>,
  Target = Record<string, never>,
>(websocket: WebSocket, options?: ThreadOptions<Self, Target>) {
  return createThread(
    {
      async send(message) {
        if (websocket.readyState !== websocket.OPEN) {
          await new Promise<void>((resolve) => {
            websocket.addEventListener(
              'open',
              () => {
                resolve();
              },
              {once: true},
            );
          });
        }

        websocket.send(JSON.stringify(message));
      },
      listen(listener, {signal}) {
        websocket.addEventListener(
          'message',
          (event) => {
            listener(JSON.parse(event.data));
          },
          {signal},
        );
      },
    },
    options,
  );
}
