import {useContext, createContext, type Context} from 'react';
import {
  createUseOptionalValueHook,
  type UseOptionalValueHook,
  type UseOptionalValueHookOptions,
} from './use-optional';

export function createOptionalContext<T>() {
  return createContext<T | undefined>(undefined);
}

export interface UseContextHook<T> extends UseOptionalValueHook<T> {}

export function createUseContextHook<T>(
  Context: Context<T>,
  {whenMissing, ...options}: UseOptionalValueHookOptions<T> = {},
) {
  return createUseOptionalValueHook(() => useContext(Context), {
    whenMissing:
      whenMissing ??
      (() => new Error(`Missing context: ${Context.displayName}`)),
    ...options,
  });
}
