/**
 * How to handle an `AbortSignal` being aborted. `'resolve'` means that
 * an asynchronous operation should resolve with `undefined` if the signal
 * aborts before the asynchronous operation completes. `'reject'`, on the
 * other hand, means that the asynchronous operation should reject with
 * an `AbortError` if the signal aborts before the asynchronous operation
 * completes.
 */
export type AbortBehavior = 'reject' | 'resolve';

/**
 * A function that handles an event.
 */
export type EventHandler<Argument = unknown> = (arg: Argument) => void;

/**
 * A map of event names to the data types that they receive.
 */
export type EventHandlerMap = {[key: string]: any};

/**
 * An object that can listen for events using an `addEventListener()`
 * method.
 */
export interface EventTargetAddEventListener<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  addEventListener<Event extends keyof Events>(
    event: Event,
    listener: EventHandler<Events[Event]>,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

/**
 * An object that can listen for events using `on()` and `off()` methods.
 */
export interface EventTargetOn<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  on<Event extends keyof Events>(
    event: Event,
    listener: EventHandler<Events[Event]>,
  ): void;
  off<Event extends keyof Events>(
    event: Event,
    listener: EventHandler<Events[Event]>,
  ): void;
}

/**
 * A function that can listen to events with the arguments passed to it.
 */
export interface EventTargetFunction<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  <Event extends keyof Events>(
    event: Event,
    listener: EventHandler<Events[Event]>,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

/**
 * Any kind of object that can listen for events that this library
 * understands.
 */
export type EventTarget<
  Events extends EventHandlerMap = Record<string, unknown>,
> =
  | EventTargetAddEventListener<Events>
  | EventTargetOn<Events>
  | EventTargetFunction<Events>;
