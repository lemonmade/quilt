import type {
  EventHandler,
  EventTarget,
  EventTargetOn,
  EventTargetAddEventListener,
} from './types.ts';

/**
 * Adds an event handler function to any kind of object capable of
 * handling events. This includes DOM `EventTarget`s and Node `EventEmitter`s.
 */
export function addEventHandler(
  target: EventTarget<any>,
  event: string | symbol,
  handler: EventHandler<any>,
  flags?: {once?: boolean; signal?: AbortSignal},
) {
  if (typeof target === 'function') {
    target(event, handler, flags);
    return;
  }

  if (
    typeof (target as EventTargetAddEventListener).addEventListener ===
    'function'
  ) {
    (target as EventTargetAddEventListener).addEventListener(
      event as any,
      handler,
      flags,
    );

    return;
  }

  if (typeof (target as EventTargetOn).on === 'function') {
    const signalAbort = new AbortController();

    const teardown = () => {
      signalAbort.abort();
      (target as EventTargetOn).off(event as any, normalizedListener);
    };

    const normalizedListener: typeof handler = flags?.once
      ? (...args) => {
          teardown();
          return handler(...args);
        }
      : handler;

    (target as EventTargetOn).on(event as any, normalizedListener);

    flags?.signal?.addEventListener('abort', teardown, {
      signal: signalAbort.signal,
    });
  }

  // TODO throw error
}
