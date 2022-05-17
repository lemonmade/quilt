import {on as onEvent} from './on';
import {once as onceEvent} from './once';
import type {AbortBehavior} from './abort';

export type EmitterEventType = string | symbol;
export type EmitterHandler<T = unknown> = (event: T) => void;

export interface Emitter<Events extends Record<EmitterEventType, unknown>> {
  on<Event extends keyof Events>(
    type: Event,
    handler: EmitterHandler<Events[Event]>,
    options?: {once?: boolean; signal?: AbortSignal; abort?: never},
  ): void;
  on<Event extends keyof Events>(
    type: Event,
    options?: {once?: boolean; signal?: AbortSignal; abort?: AbortBehavior},
  ): AsyncGenerator<Events[Event], void, void>;
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

  emit<Event extends keyof Events>(type: Event, event: Events[Event]): void;
  emit<Event extends keyof Events>(
    type: undefined extends Events[Event] ? Event : never,
  ): void;
}

export function createEmitter<
  Events extends Record<EmitterEventType, unknown>,
>(): Emitter<Events> {
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
    const signalAbort = new AbortController();

    const remove = () => {
      signalAbort.abort();
      handlers!.delete(normalizedHandler);
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

    signal?.addEventListener('abort', remove, {signal: signalAbort.signal});
  }
}
