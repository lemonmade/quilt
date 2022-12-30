import type {
  FetchEvent,
  ExportedHandlerFetchHandler,
} from '@cloudflare/workers-types';

/**
 * Takes a `FetchEvent`, which is received as the first argument in a `fetch`
 * event listener, and returns the three arguments that would be received
 * by the equivalent `fetch` handler in a modules format Cloudflare Worker:
 *
 * 1. `request`, the request being handled; this is the same as `event.request`.
 * 2. `env`, globals available to your handler, like KV namespaces. In the service
 *    worker format, these properties are available on the global object, so this
 *    adaptor returns a proxy that delegates all property accesses to `globalThis`.
 * 3. `context`, which provides some additional functionality to your handler. These
 *    properties are mostly exposed on the `FetchEvent` in the service worker format,
 *    so this function delegates to the event as needed.
 *
 * The result of calling this function can be passed to `createRequestHandler()` and
 * `respondWithAsset()`, which require arguments with the signature of the newer
 * modules format.
 */
export function transformFetchEvent<
  Env extends Record<string, any> = Record<string, unknown>,
>(event: FetchEvent): Parameters<ExportedHandlerFetchHandler<Env>> {
  return [
    event.request,
    // In the new module format, the second argument has references to
    // KV Namespaces, whereas the service worker format has these as globals
    // instead. This shim replicates this behavior by forwarding all property
    // accesses to the global environment. It’s not perfect, but good enough!
    new Proxy(
      {},
      {
        get(_, property) {
          return Reflect.get(globalThis, property);
        },
      },
    ) as any,
    {
      waitUntil(promise) {
        return event.waitUntil(promise);
      },
      passThroughOnException() {
        return event.passThroughOnException();
      },
    },
  ];
}
