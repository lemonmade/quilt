import {addEventHandler} from './handler.ts';
import {AbortError, NestedAbortController} from './abort.ts';
import type {AbortBehavior, EventHandlerMap, EventTarget} from './types.ts';

/**
 * Listens for the next `event` on the `target` object. Instead of providing a callback
 * function to run when the event is emitted, this function returns a `Promise`
 * that resolves when the next matching event is triggered.
 *
 * @param target The target to add the event handler to.
 * @param event The name of the event you are targeting.
 *
 * @returns A `Promise` that resolves when the next matching event is triggered.
 * The promise resolves with the value of the first argument passed to the event.
 * If you pass the `signal` option, the promise may also resolve with `undefined`
 * (in case the signal is aborted before the event is emitted). If you also set
 * the `abort` option to `'reject'`, the promise will instead reject with an
 * `AbortError` when the signal is aborted.
 *
 * @example
 * const button = document.querySelector('button');
 *
 * const nextClickEvent = await once(button, 'click');
 * console.log('clicked!', nextClickEvent);
 */
export async function once<
  Events extends EventHandlerMap = Record<string, unknown>,
  Event extends keyof Events = keyof Events,
>(
  target: EventTarget<Events>,
  event: Event,
  options: {
    /**
     * An `AbortSignal` to cancel listening to the event.
     */
    signal: AbortSignal;

    /**
     * How to handle the `AbortSignal` being aborted. When set to `'reject'`,
     * the promise will instead reject with an `AbortError` in this case.
     */
    abort: 'reject';
  },
): Promise<Events[Event]>;
export async function once<
  Events extends EventHandlerMap = Record<string, unknown>,
  Event extends keyof Events = keyof Events,
>(
  target: EventTarget<Events>,
  event: Event,
  options?: {
    /**
     * An `AbortSignal` to cancel listening to the event.
     */
    signal?: AbortSignal;

    /**
     * How to handle the `AbortSignal` being aborted. Defaults to `'resolve'`,
     * which causes the promise to resolve with `undefined` if the signal is
     * aborted before the next matching event. If set to `'reject'`, the promise
     * will instead reject with an `AbortError` in this case.
     */
    abort?: AbortBehavior;
  },
): Promise<Events[Event] | undefined>;
export async function once<
  Events extends EventHandlerMap = Record<string, unknown>,
  Event extends keyof Events = keyof Events,
>(
  target: EventTarget<Events>,
  event: Event,
  options?: {
    /**
     * An `AbortSignal` to cancel listening to the event.
     */
    signal?: never;

    /**
     * How to handle the `AbortSignal` being aborted. Defaults to `'resolve'`,
     * which causes the promise to resolve with `undefined` if the signal is
     * aborted before the next matching event. If set to `'reject'`, the promise
     * will instead reject with an `AbortError` in this case.
     */
    abort?: AbortBehavior;
  },
): Promise<Events[Event]>;
export async function once<
  Events extends EventHandlerMap = Record<string, unknown>,
  Event extends keyof Events = keyof Events,
>(
  target: EventTarget<Events>,
  event: Event,
  options?: {
    /**
     * An `AbortSignal` to cancel listening to the event.
     */
    signal?: AbortSignal;

    /**
     * How to handle the `AbortSignal` being aborted. Defaults to `'resolve'`,
     * which causes the promise to resolve with `undefined` if the signal is
     * aborted before the next matching event. If set to `'reject'`, the promise
     * will instead reject with an `AbortError` in this case.
     */
    abort?: AbortBehavior;
  },
): Promise<Events[Event] | undefined> {
  const signal = options?.signal;
  const abortBehavior = options?.abort ?? 'return';

  if (signal?.aborted) {
    if (abortBehavior === 'return') {
      return undefined as any;
    } else {
      throw new AbortError();
    }
  }

  const listenerAbortController = signal
    ? new NestedAbortController(signal)
    : new AbortController();

  const signalAbortController = signal && new AbortController();

  return new Promise<Events[Event] | void>((resolve, reject) => {
    const resolver = (...args: any[]) => {
      signalAbortController?.abort();
      resolve(args.length > 1 ? args : args[0]);
    };

    addEventHandler(target, event as any, resolver, {
      once: true,
      signal: listenerAbortController.signal,
    });

    if (signal) {
      addEventHandler(
        signal,
        'abort',
        () => {
          signalAbortController!.abort();

          if (abortBehavior === 'return') {
            resolve();
          } else {
            reject(new AbortError());
          }
        },
        {once: true},
      );
    }
  }) as Promise<Events[Event]>;
}
