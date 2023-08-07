import {type Signal} from '@preact/signals-core';
import {NestedAbortController} from '@quilted/events';

import {retain, release} from '../memory.ts';
import {acceptThreadAbortSignal} from '../abort-signal.ts';

import {type ThreadSignal} from './types.ts';

export function createThreadSignal<T>(
  signal: Signal<T>,
  {
    writable = false,
    signal: teardownAbortSignal,
  }: {writable?: boolean; signal?: AbortSignal} = {},
): ThreadSignal<T> {
  let initialVersion: number;

  return {
    get initial() {
      // @see https://github.com/preactjs/signals/blob/main/mangle.json#L56
      initialVersion = (signal as any).i;
      return signal.peek();
    },
    set:
      writable && !isReadonlySignal(signal)
        ? (value) => {
            signal.value = value;
          }
        : undefined,
    start(subscriber, {signal: threadAbortSignal} = {}) {
      retain(subscriber);

      const abortSignal =
        threadAbortSignal && acceptThreadAbortSignal(threadAbortSignal);

      const finalAbortSignal =
        abortSignal && teardownAbortSignal
          ? new NestedAbortController(abortSignal, teardownAbortSignal).signal
          : abortSignal ?? teardownAbortSignal;

      const teardown = signal.subscribe((value) => {
        if ((signal as any).i === initialVersion) {
          return;
        }

        subscriber(value);
      });

      finalAbortSignal?.addEventListener('abort', () => {
        teardown();
        release(subscriber);
      });

      return signal.peek();
    },
  };
}

function isReadonlySignal<T>(signal: Signal<T>): boolean {
  return (
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(signal), 'value')
      ?.set == null
  );
}
