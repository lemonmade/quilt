export interface EventTargetAddEventListener<
  EventMap = Record<string, unknown>,
> {
  addEventListener<Event extends keyof EventMap>(
    event: Event,
    listener: (
      ...args: EventMap[Event] extends any[]
        ? EventMap[Event]
        : [EventMap[Event]]
    ) => void,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

export interface EventTargetOn<EventMap = Record<string, unknown>> {
  on<Event extends keyof EventMap>(
    event: Event,
    listener: (
      ...args: EventMap[Event] extends any[]
        ? EventMap[Event]
        : [EventMap[Event]]
    ) => void,
  ): void;
  off<Event extends keyof EventMap>(
    event: Event,
    listener: (
      ...args: EventMap[Event] extends any[]
        ? EventMap[Event]
        : [EventMap[Event]]
    ) => void,
  ): void;
}

export interface EventTargetFunction<EventMap = Record<string, unknown>> {
  <Event extends keyof EventMap>(
    event: Event,
    listener: (
      ...args: EventMap[Event] extends any[]
        ? EventMap[Event]
        : [EventMap[Event]]
    ) => void,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

export type EventTarget<EventMap = Record<string, unknown>> =
  | EventTargetAddEventListener<EventMap>
  | EventTargetOn<EventMap>
  | EventTargetFunction<EventMap>;
