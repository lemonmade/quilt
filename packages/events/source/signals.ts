import {signal, type Signal} from '@preact/signals-core';

export interface EventTargetSignalOptions<Value = unknown, EventType = Event> {
  /**
   * The initial value of the signal.
   */
  initial?: Value;

  /**
   * The event name to listen for changes. The `detail` property of this event
   * will be used as the new value of the signal.
   * @default 'change'
   */
  event?: string;

  /**
   * An `AbortSignal` that, when aborted, will stop listening for events.
   */
  signal?: AbortSignal;

  /**
   * Controls the new value of the signal when the event is triggered.
   */
  value?(event: EventType): Value;
}

export function eventTargetSignal<Value = unknown, EventType = Event>(
  eventTarget: EventTarget,
  options?: EventTargetSignalOptions<Value, EventType>,
) {
  return new EventTargetSignal(eventTarget, options);
}

export class EventTargetSignal<Value = unknown, EventType = Event> {
  readonly #signal: Signal<Value>;

  get value() {
    return this.#signal.value;
  }

  peek() {
    return this.#signal.peek();
  }

  constructor(
    eventTarget: EventTarget,
    {
      initial,
      signal: abortSignal,
      event = 'change',
      value,
    }: EventTargetSignalOptions<Value, EventType> = {},
  ) {
    this.#signal = signal(initial!);

    eventTarget.addEventListener(
      event,
      (event) => {
        this.#signal.value = value
          ? value(event as any)
          : (('detail' in event
              ? (event as any).detail
              : (event as any).data) as any);
      },
      {signal: abortSignal},
    );
  }
}
