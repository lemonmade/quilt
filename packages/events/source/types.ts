export type AbortBehavior = 'reject' | 'resolve';

export type EventHandler<Argument = unknown> = (arg: Argument) => void;

export type EventHandlerMap = {[key: string]: any};

export interface EventTargetAddEventListener<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  addEventListener<Event extends keyof Events>(
    event: Event,
    listener: (arg: Events[Event]) => void,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

export interface EventTargetOn<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  on<Event extends keyof Events>(
    event: Event,
    listener: (arg: Events[Event]) => void,
  ): void;
  off<Event extends keyof Events>(
    event: Event,
    listener: (arg: Events[Event]) => void,
  ): void;
}

export interface EventTargetFunction<
  Events extends EventHandlerMap = Record<string, unknown>,
> {
  <Event extends keyof Events>(
    event: Event,
    listener: (arg: Events[Event]) => void,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

export type EventTarget<
  Events extends EventHandlerMap = Record<string, unknown>,
> =
  | EventTargetAddEventListener<Events>
  | EventTargetOn<Events>
  | EventTargetFunction<Events>;
