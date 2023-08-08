import {on as onEvent} from './on.ts';
import {once as onceEvent} from './once.ts';
import {addEventHandler} from './handler.ts';
import type {
  AbortBehavior,
  EventHandler,
  EventHandlerMap,
  EventTarget,
  EventTargetFunction,
} from './types.ts';

/**
 * Internal events triggered by an `EventEmitter` as handlers are
 * added and removed.
 */
export interface EmitterEmitterInternalEvents<
  Events extends EventHandlerMap = {},
> {
  add: {
    readonly event: keyof Events;
    readonly all: Set<EventHandler<Events[keyof Events]>>;
    readonly handler: EventHandler<Events[keyof Events]>;
  };
  remove: {
    readonly event: keyof Events;
    readonly all: Set<EventHandler<Events[keyof Events]>>;
    readonly handler: EventHandler<Events[keyof Events]>;
  };
}

/**
 * An object that can emit events. This is a minimal alternative to the `EventTarget`
 * interface available in most JavaScript environments. Unlike the callback functions
 * you provide to `EventTarget.addEventListener()`, `EventEmitter` does not support
 * event propagation, but does provide convenient `once()` and `on()` methods for
 * converting event listeners into into `Promise`s and `AsyncGenerator`s.
 */
export class EventEmitter<Events extends EventHandlerMap = {}> {
  /**
   * A map containing the event handlers registered for events on this
   * emitter. You should not directly mutate this map, but you can use it
   * to introspect the number of handlers currently registered.
   */
  readonly all = new Map<
    keyof Events,
    Set<EventHandler<Events[keyof Events]>>
  >();

  /**
   * A reference to an `EventTarget` that is being wrapped with this `EventEmitter`.
   * As handlers are added for events on the emitter, matching events are listened
   * for lazily on the `EventTarget`. This is useful for converting event producers
   * in existing environments into objects that can be used with `once()` and `on()`.
   *
   * @example
   * const button = document.querySelector('button');
   * const emitter = new EventEmitter(button);
   * // emitter.eventTarget === button
   *
   * const click = await emitter.once('click');
   * console.log('clicked!', click);
   */
  readonly eventTarget: EventTarget<Events> | undefined;

  /**
   * An `EventEmitter` that triggers events when handlers are added
   * or removed from this emitter. This is useful for debugging, and for
   * building higher-level abstractions that need to know when handlers
   * are registered for a given event.
   */
  get internal(): Pick<
    EventEmitter<EmitterEmitterInternalEvents<Events>>,
    'on' | 'once'
  > {
    if (this._internal) {
      return this._internal;
    } else {
      const internal = new EventEmitter<EmitterEmitterInternalEvents<Events>>();
      this._internal = internal;
      return internal;
    }
  }

  private _internal?: EventEmitter<EmitterEmitterInternalEvents<Events>>;

  private handleEvent: EventTargetFunction<Events> = (
    event,
    handler: any,
    options,
  ) => {
    const signal = options?.signal;
    const once = options?.once;

    let handlers = this.all.get(event);
    const signalAbort = signal && new AbortController();

    const remove = () => {
      signalAbort?.abort();

      if (handlers == null) return;
      this._internal?.emit('remove', {event, all: handlers, handler});
      handlers.delete(handler);
      if (handlers.size === 0) this.all.delete(event);
    };

    const normalizedHandler: EventHandler<any> = once
      ? (...args: any[]) => {
          remove();
          handler(...args);
        }
      : handler;

    if (handlers) {
      handlers.add(normalizedHandler);
    } else {
      handlers = new Set();
      handlers.add(normalizedHandler);
      this.all.set(event, handlers);
    }

    this._internal?.emit('add', {event, all: handlers, handler});

    signal?.addEventListener('abort', remove, {signal: signalAbort!.signal});
  };

  constructor(eventTarget?: EventTarget<Events>) {
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.emit = this.emit.bind(this);

    if (eventTarget) {
      this.eventTarget = eventTarget;

      const abortMap = new Map<keyof Events, AbortController>();

      this.internal.on('add', ({event: eventName, all}) => {
        if (all.size !== 1) return;

        const abort = new AbortController();
        abortMap.set(eventName, abort);

        addEventHandler(
          eventTarget,
          eventName as any,
          (event) => {
            this.emit(eventName, event);
          },
          {
            signal: abort.signal,
          },
        );
      });

      this.internal.on('remove', ({event: eventName, all}) => {
        const abort = all.size === 0 ? abortMap.get(eventName) : undefined;

        if (abort == null) return;

        abort.abort();
        abortMap.delete(eventName);
      });
    }
  }

  /**
   * Listens to an `event` on the `target` object. Instead of providing a callback
   * function to run when the event is emitted, this function returns an `AsyncGenerator`
   * that yields each event as it is emitted.
   *
   * @param event The name of the event you are targeting.
   *
   * @returns An `AsyncGenerator` that yields each event as it is emitted.
   *
   * @example
   * const emitter = new EventEmitter<{message: string}>();
   *
   * for await (const message of emitter.on('message')) {
   *   console.log('message', message);
   * }
   */
  on<Event extends keyof Events>(
    event: Event,
    options?: {
      /**
       * An `AbortSignal` to cancel listening to the event.
       */
      signal?: AbortSignal;

      /**
       * How to handle the `AbortSignal` being aborted. Defaults to `'resolve'`,
       * which causes the iterator to complete. If set to `'reject'`, the iterator
       * will throw an `AbortError` when the signal is aborted instead.
       */
      abort?: AbortBehavior;
    },
  ): AsyncGenerator<Events[Event], void, void>;

  /**
   * Listens for `event` to be triggered.
   *
   * @param event The name of the event you are targeting.
   * @param handler The function to call when the event is triggered.
   *
   * @example
   * const emitter = new EventEmitter<{message: string}>();
   *
   * emitter.on('message', (message) => {
   *   console.log('message', message);
   * });
   */
  on<Event extends keyof Events>(
    event: Event,
    handler: EventHandler<Events[Event]>,
    options?: {
      /**
       * An `AbortSignal` to cancel listening to the event.
       */
      signal?: AbortSignal;
      abort?: never;
    },
  ): void;
  on<Event extends keyof Events>(
    event: Event,
    argOne?: any,
    argTwo?: any,
  ): any {
    return typeof argOne === 'function'
      ? this.handleEvent(event, argOne, argTwo)
      : onEvent<Events>(this.handleEvent, event, argOne);
  }

  /**
   * Listens for the next matching `event` to be triggered.
   *
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
   * const emitter = new EventEmitter<{message: string}>();
   *
   * const nextMessage = await emitter.once('message');
   * console.log('message', nextMessage);
   */
  once<Event extends keyof Events>(
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
  once<Event extends keyof Events>(
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
  once<Event extends keyof Events>(
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

  /**
   * Listens for the next matching `event` to be triggered.
   *
   * @param event The name of the event you are targeting.
   * @param handler The function to call when the event is triggered.
   *
   * @example
   * const emitter = new EventEmitter<{message: string}>();
   *
   * emitter.once('message', (message) => {
   *   console.log('message', message);
   * });
   */
  once<Event extends keyof Events>(
    event: Event,
    handler: EventHandler<Events[Event]>,
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
  ): void;
  once<Event extends keyof Events>(
    event: Event,
    argOne?: any,
    argTwo?: any,
  ): any {
    return typeof argOne === 'function'
      ? this.handleEvent(event, argOne, {...argTwo, once: true})
      : onceEvent<Events>(this.handleEvent, event, argOne);
  }

  /**
   * Emits an event with the given `data`. This will trigger all handlers
   * listening for the provided `event`.
   */
  emit<Event extends keyof Events>(event: Event, data?: Events[Event]) {
    const handlers = this.all.get(event);

    if (handlers) {
      for (const handler of Array.from(handlers)) {
        handler(data as any);
      }
    }
  }
}

/**
 * Creates an object that can emit events. This is a minimal alternative to the `EventTarget`
 * interface available in most JavaScript environments. Unlike the callback functions
 * you provide to `EventTarget.addEventListener()`, `EventEmitter` does not support
 * event propagation, but does provide convenient `once()` and `on()` methods for
 * converting event listeners into into `Promise`s and `AsyncGenerator`s.
 */
export function createEventEmitter<
  Events extends EventHandlerMap = {},
>(): EventEmitter<Events> {
  return new EventEmitter<Events>();
}
