import {addListener} from './listeners.ts';
import type {AbortBehavior} from './abort.ts';
import {AbortError, NestedAbortController} from './abort.ts';
import type {EventTarget} from './types.ts';

export async function once<
  EventMap = Record<string, unknown>,
  Event extends keyof EventMap = keyof EventMap,
  Target extends EventTarget<EventMap> = EventTarget<EventMap>,
>(target: Target, event: Event): Promise<EventMap[Event]>;
export async function once<
  EventMap = Record<string, unknown>,
  Event extends keyof EventMap = keyof EventMap,
  Target extends EventTarget<EventMap> = EventTarget<EventMap>,
  Abort extends AbortBehavior = 'returns',
>(
  target: Target,
  event: Event,
  options: {signal?: AbortSignal; abort?: Abort},
): Promise<
  Abort extends 'returns' ? EventMap[Event] | undefined : EventMap[Event]
>;
export async function once<
  EventMap = Record<string, unknown>,
  Event extends keyof EventMap = keyof EventMap,
  Target extends EventTarget<EventMap> = EventTarget<EventMap>,
  Abort extends AbortBehavior = 'returns',
>(
  target: Target,
  event: Event,
  options?: {signal?: AbortSignal; abort?: Abort},
): Promise<
  Abort extends 'returns' ? EventMap[Event] | undefined : EventMap[Event]
> {
  const signal = options?.signal;
  const abortBehavior = options?.abort ?? 'returns';

  if (signal?.aborted) {
    if (abortBehavior === 'returns') {
      return undefined as any;
    } else {
      throw new AbortError();
    }
  }

  const listenerAbortController = new NestedAbortController(signal);
  const signalAbortController = signal && new NestedAbortController(signal);

  return new Promise<EventMap[Event] | void>((resolve, reject) => {
    const resolver = (...args: any[]) => {
      signalAbortController?.abort();
      resolve(args.length > 1 ? args : args[0]);
    };

    addListener(target, event as any, resolver, {
      once: true,
      signal: listenerAbortController.signal,
    });

    if (signal) {
      addListener(
        signal,
        'abort',
        () => {
          listenerAbortController.abort();

          if (abortBehavior === 'returns') {
            resolve();
          } else {
            reject(new AbortError());
          }
        },
        {once: true},
      );
    }
  }) as Promise<EventMap[Event]>;
}
