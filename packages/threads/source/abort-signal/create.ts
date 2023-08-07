import {retain, release} from '../memory.ts';
import type {ThreadAbortSignal} from './types.ts';

export function createThreadAbortSignal(
  signal: AbortSignal,
): ThreadAbortSignal {
  const listeners = new Set<(aborted: boolean) => void>();

  if (signal.aborted) {
    return {
      aborted: true,
    };
  }

  signal.addEventListener(
    'abort',
    () => {
      for (const listener of listeners) {
        listener(signal.aborted);
        release(listener);
        listeners.clear();
      }
    },
    {once: true},
  );

  return {
    aborted: false,
    start(listener) {
      if (signal.aborted) return true;

      retain(listener);
      listeners.add(listener);
      return false;
    },
  };
}
