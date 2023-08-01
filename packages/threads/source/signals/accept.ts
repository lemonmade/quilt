import {signal as createSignal, type Signal} from '@preact/signals-core';

import {createThreadAbortSignal} from '../abort.ts';

import {type ThreadSignal} from './types.ts';

export function isThreadSignal<T = unknown>(
  value?: unknown,
): value is ThreadSignal<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    'initial' in value &&
    typeof (value as any).start === 'function'
  );
}

export function acceptThreadSignal<T>(
  threadSignal: ThreadSignal<T>,
  {signal: abortSignal}: {signal?: AbortSignal} = {},
): Signal<T> {
  const signal = createSignal(threadSignal.initial);
  const threadAbortSignal = abortSignal && createThreadAbortSignal(abortSignal);

  const valueDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(signal),
    'value',
  )!;

  Object.defineProperty(signal, 'value', {
    ...valueDescriptor,
    get() {
      return valueDescriptor.get?.call(this);
    },
    set(value) {
      if (threadSignal.set == null) {
        throw new Error(`You can’t set the value of a readonly thread signal.`);
      }

      threadSignal.set(value);
      return valueDescriptor.set?.call(this, value);
    },
  });

  threadSignal.start(
    (value) => {
      valueDescriptor.set?.call(signal, value);
    },
    {signal: threadAbortSignal},
  );

  return signal;
}
