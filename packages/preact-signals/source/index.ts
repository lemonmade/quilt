import type {ComponentChildren} from 'preact';
import {useState, useEffect, useMemo, useCallback, useRef} from 'preact/hooks';
import {
  signal,
  computed,
  effect,
  Signal,
  type ReadonlySignal,
} from '@preact/signals';
import {For} from '@preact/signals/utils';

export * from '@preact/signals/utils';
export * from '@preact/signals';

// `<For>` types do not allow readonly arrays
export interface ForProps<T> {
  each:
    | Signal<Array<T> | ReadonlyArray<T>>
    | ReadonlySignal<Array<T> | ReadonlyArray<T>>
    | (() =>
        | Array<T>
        | ReadonlyArray<T>
        | Signal<Array<T> | ReadonlyArray<T>>
        | ReadonlySignal<Array<T> | ReadonlyArray<T>>);
  fallback?: ComponentChildren;
  children: (value: T, index: number) => ComponentChildren;
}
const TypedFor = For as any as <T>(
  props: ForProps<T>,
) => ReturnType<typeof For<T>>;
export {TypedFor as For};

export {
  isSignal,
  resolveSignalOrValue,
  signalToIterator,
  type SignalOrValue,
} from '@quilted/signals';

const EMPTY_ARGUMENTS = Object.freeze([]) as any as unknown[];

export function useSignal<T>(
  value: T | (() => T),
  args: unknown[] = EMPTY_ARGUMENTS,
): Signal<T> {
  return useMemo(
    () => signal(typeof value === 'function' ? (value as any)() : value),
    args,
  );
}

export function useComputed<T>(
  value: () => T,
  args: unknown[] = EMPTY_ARGUMENTS,
): Signal<T> {
  return useMemo(() => computed(value), args);
}

export function useSignalEffect(
  cb: () => void | (() => void),
  args: unknown[] = EMPTY_ARGUMENTS,
) {
  const callback = useRef(cb);
  callback.current = cb;

  useEffect(() => {
    return effect(() => {
      callback.current();
    });
  }, args);
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
