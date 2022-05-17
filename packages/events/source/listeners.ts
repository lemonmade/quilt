import type {
  EventTarget,
  EventTargetOn,
  EventTargetAddEventListener,
} from './types';

export function addListener(
  target: EventTarget<any>,
  name: string | symbol,
  listener: (...args: any[]) => void,
  flags?: {once?: boolean; signal?: AbortSignal},
) {
  if (typeof target === 'function') {
    target(name, listener, flags);
    return;
  }

  if (
    typeof (target as EventTargetAddEventListener).addEventListener ===
    'function'
  ) {
    (target as EventTargetAddEventListener).addEventListener(
      name as any,
      listener,
      flags,
    );

    return;
  }

  if (typeof (target as EventTargetOn).on === 'function') {
    const signalAbort = new AbortController();

    const teardown = () => {
      signalAbort.abort();
      (target as EventTargetOn).off(name as any, listener);
    };

    const normalizedListener: typeof listener = flags?.once
      ? (...args) => {
          teardown();
          return listener(...args);
        }
      : listener;

    (target as EventTargetOn).on(name as any, normalizedListener);

    flags?.signal?.addEventListener('abort', teardown, {
      signal: signalAbort.signal,
    });
  }

  // TODO throw error
}
