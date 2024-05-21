import {Signal} from '@preact/signals-core';

export type SignalOrValue<T> = T | Signal<T>;

export function isSignal<T = unknown>(value: unknown): value is Signal<T> {
  return value != null && value instanceof Signal;
}

export function resolveSignalOrValue<T>(
  value: SignalOrValue<T>,
  options?: {peek?: boolean},
): T {
  return isSignal(value) ? (options?.peek ? value.peek() : value.value) : value;
}
