import {useState, useEffect, useMemo, useCallback} from 'react';
import {signal, computed, effect, Signal} from '@preact/signals';

export * from '@preact/signals';

const EMPTY_ARGUMENTS = Object.freeze([]) as any as unknown[];

export function useSignal<T>(
  value: T | (() => T),
  args: unknown[] = EMPTY_ARGUMENTS,
): Signal<T> {
  return useMemo(
    () => signal(typeof value === 'function' ? (value as any)() : value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    args,
  );
}

export function useComputed<T>(
  value: () => T,
  args: unknown[] = EMPTY_ARGUMENTS,
): Signal<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computed(value), args);
}

export function useSignalState<T>(signal: Signal<T>) {
  const value = useSignalValue(signal);
  const set = useCallback(
    (value: T | ((current: T) => T)) => {
      signal.value =
        typeof value === 'function' ? (value as any)(signal.value) : value;
    },
    [signal],
  );

  return [value, set] as const;
}

export function useSignalValue<T>(signal: Signal<T>) {
  const [details, setDetails] = useState(() => ({
    signal,
    value: signal.value,
  }));

  let valueToReturn = details.value;

  if (details.signal !== signal) {
    valueToReturn = signal.value;
    setDetails({value: valueToReturn, signal});
  }

  useEffect(() => {
    let didUnsubscribe = false;

    const checkForUpdates = (newValue: T) => {
      if (didUnsubscribe) {
        return;
      }

      setDetails((currentDetails) => {
        const {value: currentValue, signal} = currentDetails;
        if (currentValue === newValue) return currentDetails;
        return {value: newValue, signal};
      });
    };

    const teardown = effect(() => {
      checkForUpdates(signal.value);
    });

    return () => {
      didUnsubscribe = true;
      teardown();
    };
  }, [signal]);

  return valueToReturn;
}

export type SignalOrValue<T> = T | Signal<T>;

export function isSignal<T = unknown>(value: unknown): value is Signal<T> {
  return value != null && value instanceof Signal;
}

export function resolveSignalOrValue<T>(value: SignalOrValue<T>): T {
  return isSignal(value) ? value.value : value;
}
