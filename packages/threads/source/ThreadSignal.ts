import {Signal, type ReadonlySignal} from '@preact/signals-core';
import {NestedAbortController} from '@quilted/events';

import {
  ThreadAbortSignal,
  type ThreadAbortSignalSerialization,
} from './ThreadAbortSignal.ts';

/**
 * Options for creating a ThreadSignal.
 */
export interface ThreadSignalOptions {
  /**
   * An optional AbortSignal that can cancel synchronizing the
   * (Preact) signal to its paired thread.
   */
  signal?: AbortSignal;

  /**
   * Whether to serialize a setter, which allows the target thread
   * to update the signal value.
   *
   * @default false
   */
  writable?: boolean;

  /**
   * An optional function to retain memory for transferred functions.
   */
  retain?(value: unknown): void;

  /**
   * An optional function to release memory for transferred functions.
   */
  release?(value: unknown): void;
}

/**
 * A serialized representation of a Preact signal that can be transferred
 * between threads.
 */
export interface ThreadSignalSerialization<T> {
  /**
   * The initial value of the signal.
   */
  initial: T;

  /**
   * Sets the value of the original signal. When not provided, the signal
   * will be read-only.
   */
  set?(value: T): void;

  /**
   * Starts synchronizing the signal between threads.
   */
  start(
    listener: (value: T) => void,
    options?: {
      signal?: ThreadAbortSignalSerialization;
    },
  ): void;
}

/**
 * A representation of a Preact signal that can be serialized between
 * two threads. This class is used in the “receiving” environment, in order
 * to convert a serialized representation back into a “live” one.
 */
export class ThreadSignal<T> extends Signal<T> {
  constructor(
    serialization: ThreadSignalSerialization<T>,
    {
      writable = typeof serialization.set === 'function',
      signal,
      retain,
      release,
    }: ThreadSignalOptions = {},
  ) {
    super(serialization.initial);

    retain?.(serialization);

    const valueDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(Object.getPrototypeOf(this)),
      'value',
    )!;

    Object.defineProperty(this, 'value', {
      ...valueDescriptor,
      get() {
        return valueDescriptor.get?.call(this);
      },
      set: writable
        ? (value) => {
            serialization.set!(value);
            return valueDescriptor.set?.call(this, value);
          }
        : undefined,
    });

    serialization.start(
      (value) => {
        valueDescriptor.set?.call(this, value);
      },
      {
        signal:
          signal && ThreadAbortSignal.serialize(signal, {retain, release}),
      },
    );

    if (release && signal) {
      signal.addEventListener('abort', () => release(serialization), {
        once: true,
      });
    }
  }

  /**
   * Serializes a Preact signal for transfer between threads.
   */
  static serialize<T>(
    signal: ReadonlySignal<T>,
    {
      writable = false,
      signal: abortSignal,
      retain,
      release,
    }: ThreadSignalOptions = {},
  ): ThreadSignalSerialization<T> {
    let initialVersion: number;

    return {
      initial: signal.peek(),
      set:
        writable && !isReadonlySignal(signal)
          ? (value: T) => {
              (signal as Signal<T>).value = value;
            }
          : undefined,
      start(subscriber, {signal: serializedAbortSignal} = {}) {
        retain?.(subscriber);

        const threadAbortSignal =
          serializedAbortSignal &&
          new ThreadAbortSignal(serializedAbortSignal, {
            signal: abortSignal,
            retain,
            release,
          });

        const finalAbortSignal = threadAbortSignal
          ? abortSignal
            ? new NestedAbortController(abortSignal, threadAbortSignal).signal
            : threadAbortSignal
          : abortSignal;

        initialVersion = (signal as any).i;
        const teardown = signal.subscribe((value) => {
          if ((signal as any).i === initialVersion) return;
          subscriber(value);
        });

        finalAbortSignal?.addEventListener(
          'abort',
          () => {
            teardown();
            release?.(subscriber);
          },
          {once: true},
        );
      },
    };
  }

  /**
   * Checks if a value is a serialized ThreadSignal.
   */
  static isSerialized<T = unknown>(
    value: unknown,
  ): value is ThreadSignalSerialization<T> {
    return (
      typeof value === 'object' &&
      value != null &&
      typeof (value as any).start === 'function'
    );
  }
}

/**
 * A representation of a Preact signal that can be serialized between
 * two threads. This class is used in the “receiving” environment, in order
 * to convert a serialized representation back into a “live” one.
 */
export function threadSignal<T>(
  serialization: ThreadSignalSerialization<T>,
  options?: ThreadSignalOptions,
) {
  return new ThreadSignal<T>(serialization, options);
}

function isReadonlySignal<T>(signal: ReadonlySignal<T>): boolean {
  return (
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(signal), 'value')
      ?.set == null
  );
}
