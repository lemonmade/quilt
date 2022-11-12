import {on as onEvent} from './on';
import {once as onceEvent} from './once';
import type {AbortBehavior} from './abort';

export type EmitterHandler<T = unknown> = (event: T) => void;

// eslint-disable-next-line @typescript-eslint/ban-types
export interface Emitter<Events = {}> {
  on<Event extends keyof Events>(
    type: Event,
    options: {once: true; signal?: never; abort?: never},
  ): Promise<Events[Event]>;
  on<Event extends keyof Events, Abort extends AbortBehavior = 'returns'>(
    type: Event,
    options: {once: true; signal: AbortSignal; abort?: Abort},
  ): Promise<
    Abort extends 'returns' ? Events[Event] | undefined : Events[Event]
  >;
  on<Event extends keyof Events>(
    type: Event,
    options?: {once?: boolean; signal?: AbortSignal; abort?: AbortBehavior},
  ): AsyncGenerator<Events[Event], void, void>;
  on<Event extends keyof Events>(
    type: Event,
    handler: EmitterHandler<Events[Event]>,
    options?: {once?: boolean; signal?: AbortSignal; abort?: never},
  ): void;

  emit<Event extends keyof Events>(type: Event, event: Events[Event]): void;
  emit<Event extends keyof Events>(
    type: undefined extends Events[Event] ? Event : never,
  ): void;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function createEmitter<Events = {}>(
  internal?: Emitter<EmitterInternalEvents<Events>>,
): Emitter<Events> {
  const handlerMap = new Map<keyof Events, Set<any>>();

  return {
    on,
    emit<Event extends keyof Events>(event: Event, data?: Events[Event]) {
      const handlers = handlerMap.get(event);

      if (handlers) {
        for (const handler of Array.from(handlers)) {
          handler(data);
        }
      }
    },
  };

  function on<Event extends keyof Events>(
    event: Event,
    argOne?: any,
    argTwo?: any,
  ): any {
    if (typeof argOne !== 'function') {
      const signal = argOne?.signal;
      const abort = argOne?.abort;
      const once = argOne?.once ?? false;

      return once
        ? onceEvent<Events>(on, event, {signal, abort})
        : onEvent<Events>(on, event, {signal, abort});
    }

    const handler = argOne as EmitterHandler<Events[Event]>;
    const signal = argTwo?.signal as AbortSignal | undefined;
    const once = argTwo?.once as boolean | undefined;

    let handlers = handlerMap.get(event);
    const signalAbort = signal && new AbortController();

    const remove = () => {
      signalAbort?.abort();

      if (handlers == null) return;
      handlers.delete(normalizedHandler);
      internal?.emit('remove', {event, handler: handler as any, all: handlers});
      if (handlers!.size === 0) handlerMap.delete(event);
    };

    const normalizedHandler = once
      ? (...args: any[]) => {
          remove();
          (handler as any)(...args);
        }
      : handler;

    if (handlers) {
      handlers.add(normalizedHandler);
    } else {
      handlers = new Set();
      handlers.add(normalizedHandler);
      handlerMap.set(event, handlers);
    }

    internal?.emit('add', {event, handler: handler as any, all: handlers});

    signal?.addEventListener('abort', remove, {signal: signalAbort!.signal});
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface EmitterInternalEvents<Events = {}> {
  add: {
    event: keyof Events;
    handler: EmitterHandler<unknown>;
    all: Set<EmitterHandler<unknown>>;
  };
  remove: {
    event: keyof Events;
    handler: EmitterHandler<unknown>;
    all: Set<EmitterHandler<unknown>>;
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface EmitterWithInternals<Events = {}> extends Emitter<Events> {
  readonly internal: Emitter<EmitterInternalEvents<Events>>;
}

export function createEmitterWithInternals<
  // eslint-disable-next-line @typescript-eslint/ban-types
  Events = {},
>(): EmitterWithInternals<Events> {
  const internal = createEmitter<EmitterInternalEvents<Events>>();
  const emitter = createEmitter(internal);

  (emitter as any).internal = internal;

  return emitter as any;
}
